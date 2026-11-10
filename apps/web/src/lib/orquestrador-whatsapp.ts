/**
 * Orquestrador do fluxo conversacional WhatsApp / Instagram da CET.
 * Processa mensagens recebidas, mantém estado da conversa no banco,
 * e responde com mensagens interativas e regras inegociáveis de LGPD.
 * 
 * Regras rígidas:
 * 1. LGPD: NUNCA coletar dados médicos sensíveis (prontuários, exames individuais).
 * 2. Deduplicação de mensagem por wamid (nunca processa a mesma mensagem duas vezes).
 * 3. Gatilhos Críticos - Rota A: Transbordo imediato para vendedor sênior (SLA 10 min).
 * 4. Ficha Inteligente: Direciona opções 1 a 4 para formulário dinâmico.
 * 5. Idempotência e rastreabilidade total de protocolos.
 */

import { prisma } from '@cet/db';
import { normalizarTelefone, gerarProtocolo } from './validacoes';
import { enviarTexto, marcarComoLida } from './whatsapp-client';
import {
  type ContextoConversa,
  type EstadoConversa,
  MENSAGENS,
  MENU_OPCOES,
  MAX_TENTATIVAS_INVALIDAS,
  SESSAO_TIMEOUT_MS,
  dentroDoHorarioComercial,
  verificarGatilhoRotaA,
  verificarGatilhoAtivacao,
  verificarTriggerDiagnostico,
} from './fluxo-conversa';
import { VERSAO_CONSENTIMENTO_ATUAL, getHashConsentimento } from '@cet/shared';
import { linkCurtoFicha } from './link-curto';
import { gerarRespostaGeminiCET } from './gemini-client';

// Cache em memória para sessões ativas (mantido com fallback para banco de dados)
const sessoes = new Map<string, ContextoConversa & { intencaoPendente?: string }>();

/**
 * Reseta o contexto de sessão em memória para um telefone.
 * Usado quando um atendente devolve a conversa para o robô.
 */
export function resetarSessao(telefone: string): void {
  sessoes.delete(telefone);
}

/**
 * Envia uma mensagem e registra no banco de dados com direção 'saida'.
 */
async function responderEGravar(
  telefone: string,
  ctx: ContextoConversa,
  texto: string,
): Promise<void> {
  const res = await enviarTexto(telefone, texto);
  if (ctx.lead_id) {
    await prisma.mensagem.create({
      data: {
        lead_id: ctx.lead_id,
        direcao: 'saida',
        canal: 'whatsapp',
        wamid: res.wamid,
        conteudo: texto,
        status: res.sucesso ? 'enviada' : 'falha',
        erro: res.erro,
      },
    }).catch(err => console.error('[Orquestrador] Erro ao gravar mensagem de saída:', err));
  }
}

/**
 * Ponto de entrada: processa uma mensagem recebida do WhatsApp.
 */
export async function processarMensagem(
  from: string,
  wamid: string,
  tipo: 'text' | 'interactive' | 'button',
  conteudo: string,
  interactiveId?: string,
  pushName?: string,
): Promise<void> {
  const telefone = normalizarTelefone(from);

  // 1. Deduplicação estrita por wamid
  const jaProcessada = await prisma.mensagem.findUnique({ where: { wamid } });
  if (jaProcessada) {
    console.log(`[Orquestrador] Mensagem ${wamid} já processada — ignorando para garantir taxa zero de duplicação.`);
    return;
  }

  // 2. Marcar como lida em background (não bloqueia resposta)
  marcarComoLida(wamid).catch(() => {});

  // 3. Obter ou criar contexto de sessão (cache em memória ultra-rápido)
  const ctx = await obterSessao(telefone);

  if (pushName && !ctx.nome && pushName.trim().length >= 2) {
    ctx.nome = pushName.trim();
  }

  // 4. Localizar ou registrar Contato e Lead para garantir rastreabilidade total no CRM
  let lead = null;
  if (!ctx.contato_id || !ctx.lead_id) {
    let contato = await prisma.contato.findUnique({
      where: { telefone_e164: telefone },
      include: {
        leads: {
          orderBy: { criado_em: 'desc' },
          take: 1,
          include: { atendente: true },
        },
      },
    });

    if (!contato) {
      contato = await prisma.contato.create({
        data: {
          nome: ctx.nome || pushName || 'Cliente WhatsApp',
          telefone_e164: telefone,
          canal_preferido: 'whatsapp',
        },
        include: {
          leads: {
            orderBy: { criado_em: 'desc' },
            take: 1,
            include: { atendente: true },
          },
        },
      });
    } else if (!contato.nome && (ctx.nome || pushName)) {
      await prisma.contato.update({
        where: { id: contato.id },
        data: { nome: ctx.nome || pushName },
      }).catch(() => {});
    }

    ctx.contato_id = contato.id;
    if (contato.nome && !ctx.nome) {
      ctx.nome = contato.nome;
    }

    if (contato.leads.length > 0) {
      lead = contato.leads[0];
      ctx.lead_id = lead.id;
    } else {
      const protocolo = gerarProtocolo();
      lead = await prisma.lead.create({
        data: {
          contato_id: contato.id,
          canal: 'whatsapp',
          protocolo,
          primeira_intencao: 'Atendimento WhatsApp',
        },
        include: { atendente: true },
      });
      ctx.lead_id = lead.id;
    }
  } else {
    lead = await prisma.lead.findUnique({
      where: { id: ctx.lead_id },
      include: { atendente: true },
    });
  }

  // 5. Salvar mensagem de entrada IMEDIATAMENTE (deduplicação por wamid persistida)
  if (ctx.lead_id) {
    await prisma.mensagem.create({
      data: {
        lead_id: ctx.lead_id,
        direcao: 'entrada',
        canal: 'whatsapp',
        wamid,
        conteudo: conteudo || (interactiveId ? `[Opção: ${interactiveId}]` : ''),
        status: 'recebida',
      },
    }).catch(err => console.error('[Orquestrador] Erro ao gravar mensagem:', err));
  }

  // 6. REGRA DE SILÊNCIO: Se houver atendente humano ativo
  if (lead?.atendente_id) {
    console.log(`[Orquestrador] ${telefone} está sob atendimento humano (${lead.atendente_id}) — robô em silêncio.`);
    return;
  }

  // Se a sessão estava em transbordo, verificar se o cliente solicitou retorno ao menu
  if (ctx.estado === 'transbordo') {
    const querRetomar =
      verificarTriggerDiagnostico(conteudo) ||
      ['menu', 'iniciar', 'reiniciar', 'voltar', 'oi', 'ola', 'olá'].includes(conteudo.trim().toLowerCase()) ||
      /^[1-6]$/.test(conteudo.trim());

    if (querRetomar) {
      console.log(`[Orquestrador] ${telefone} retornando ao menu a partir do transbordo.`);
      ctx.estado = 'inicio';
    } else {
      console.log(`[Orquestrador] ${telefone} está em transbordo — mensagem arquivada para a equipe.`);
      return;
    }
  }

  // 7. FAST-TRACK DE GATILHO OFICIAL: "quero receber um diagnostico da minha empresa"
  // Intercepta imediatamente em QUALQUER momento com resposta instantânea e mínima latência
  if (conteudo && verificarTriggerDiagnostico(conteudo)) {
    const intencaoTitulo = 'Diagnóstico Completo da Empresa';
    if (ctx.contato_id) {
      prisma.consentimento.create({
        data: {
          contato_id: ctx.contato_id,
          versao_texto: VERSAO_CONSENTIMENTO_ATUAL,
          texto_hash: getHashConsentimento(),
          finalidade: 'triagem_atendimento_diagnostico_proposta',
        },
      }).catch((err) => console.error('[LGPD] Erro ao salvar consentimento via trigger:', err));
    }

    if (ctx.nome) {
      await criarLeadEFicha(telefone, ctx, intencaoTitulo);
    } else {
      (ctx as any).intencaoPendente = intencaoTitulo;
      ctx.estado = 'nome';
      ctx.tentativas_invalidas = 0;
      atualizarSessao(telefone, ctx);
      await responderEGravar(telefone, ctx, MENSAGENS.RESPOSTA_TRIGGER_DIAGNOSTICO);
    }
    return;
  }

  // 8. GATILHO DE ATIVAÇÃO: Evita conversas aleatórias, spam, stickers ou mensagens avulsas.
  // Se o estado for 'inicio', só responde se o usuário enviar saudações, termos SST, números 1 a 6 ou já tiver lead.
  if (ctx.estado === 'inicio') {
    const jaTemContato = !!(ctx.contato_id || ctx.lead_id || lead);
    const ativou = verificarGatilhoAtivacao(conteudo);
    if (!ativou && !jaTemContato) {
      console.log(`[Orquestrador] Mensagem de ${telefone} ignorada (não ativou gatilho de atendimento): "${conteudo}"`);
      return;
    }
  }

  // 9. Verificar Gatilhos Críticos - Rota A (Interrupção imediata da automação e SLA de 10 min)
  const gatilhoRotaA = verificarGatilhoRotaA({ texto: conteudo });
  if (gatilhoRotaA.ativa) {
    console.log(`[Orquestrador] Gatilho Rota A acionado para ${telefone}: ${gatilhoRotaA.motivo}`);
    await acionarRotaA(telefone, ctx, gatilhoRotaA.motivo);
    return;
  }

  // 9. Determinar ação baseada no estado atual
  const idResposta = interactiveId || conteudo;

  switch (ctx.estado) {
    case 'inicio':
      await tratarInicio(telefone, ctx, conteudo);
      break;

    case 'consentimento':
      await tratarConsentimento(telefone, ctx, idResposta);
      break;

    case 'menu':
      await tratarMenu(telefone, ctx, idResposta);
      break;

    case 'nome':
      await tratarNome(telefone, ctx, conteudo);
      break;

    case 'intencao':
      await tratarIntencao(telefone, ctx, idResposta);
      break;

    case 'ficha_criada':
      await tratarPosFicha(telefone, ctx, idResposta);
      break;

    case 'encerrado':
      if (verificarGatilhoAtivacao(conteudo)) {
        ctx.estado = 'inicio';
        await tratarInicio(telefone, ctx, conteudo);
      }
      break;
  }
}

// =============================================================================
// Tratadores de estado
// =============================================================================

async function tratarInicio(telefone: string, ctx: ContextoConversa, conteudo?: string): Promise<void> {
  // 1. Se já possui ficha em andamento no contexto da sessão, retoma imediatamente
  if (ctx.ficha_token) {
    const link = linkCurtoFicha(ctx.ficha_token);
    const msg = `${MENSAGENS.FICHA_INCOMPLETA}\n\nLink para continuar direto pelo celular:\n👉 ${link}`;
    await responderEGravar(telefone, ctx, msg);
    ctx.estado = 'ficha_criada';
    atualizarSessao(telefone, ctx);
    return;
  }

  // 2. Se ainda não possui dados em memória, consulta o banco
  if (!ctx.contato_id) {
    const contato = await prisma.contato.findUnique({
      where: { telefone_e164: telefone },
      include: {
        leads: {
          orderBy: { criado_em: 'desc' },
          take: 1,
          include: {
            fichas: {
              where: { status: { not: 'concluida' } },
              take: 1,
            },
          },
        },
      },
    });

    if (contato && contato.leads.length > 0) {
      const lead = contato.leads[0];
      ctx.contato_id = contato.id;
      ctx.lead_id = lead.id;
      ctx.nome = contato.nome;

      if (lead.fichas.length > 0) {
        const ficha = lead.fichas[0];
        const link = linkCurtoFicha(ficha.token_retomada);
        const msg = `${MENSAGENS.FICHA_INCOMPLETA}\n\nLink para continuar direto pelo celular:\n👉 ${link}`;

        await responderEGravar(telefone, ctx, msg);
        ctx.ficha_token = ficha.token_retomada;
        ctx.estado = 'ficha_criada';
        atualizarSessao(telefone, ctx);
        return;
      }
    }
  }

  // 3. GATILHO OFICIAL PRIORITÁRIO: "quero receber um diagnostico da minha empresa"
  if (conteudo && verificarTriggerDiagnostico(conteudo)) {
    const intencaoTitulo = 'Diagnóstico Completo da Empresa';
    if (ctx.contato_id) {
      prisma.consentimento.create({
        data: {
          contato_id: ctx.contato_id,
          versao_texto: VERSAO_CONSENTIMENTO_ATUAL,
          texto_hash: getHashConsentimento(),
          finalidade: 'triagem_atendimento_diagnostico_proposta',
        },
      }).catch((err) => console.error('[LGPD] Erro ao salvar consentimento via trigger:', err));
    }

    if (ctx.nome) {
      await criarLeadEFicha(telefone, ctx, intencaoTitulo);
    } else {
      (ctx as any).intencaoPendente = intencaoTitulo;
      ctx.estado = 'nome';
      ctx.tentativas_invalidas = 0;
      atualizarSessao(telefone, ctx);
      await responderEGravar(telefone, ctx, MENSAGENS.RESPOSTA_TRIGGER_DIAGNOSTICO);
    }
    return;
  }

  // 4. Se o usuário já iniciou com uma dúvida específica em texto livre (não apenas saudação simples)
  const ehSaudacaoSimples = ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'ola!', 'oi!'].includes(conteudo?.trim().toLowerCase() || '');
  if (conteudo && !ehSaudacaoSimples && conteudo.trim().length > 5 && !/^[1-6]$/.test(conteudo.trim())) {
    try {
      const respostaIA = await gerarRespostaGeminiCET(conteudo, {
        nomeCliente: ctx.nome,
      });
      if (respostaIA) {
        await responderEGravar(telefone, ctx, respostaIA);
        ctx.estado = 'menu';
        ctx.tentativas_invalidas = 0;
        atualizarSessao(telefone, ctx);
        return;
      }
    } catch (err) {
      console.error('[Orquestrador] Erro ao responder início com Gemini:', err);
    }
  }

  // 5. Mensagem de Abertura Humanizada com 6 opções numéricas e aviso LGPD
  await responderEGravar(telefone, ctx, MENSAGENS.ABERTURA_OBRIGATORIA);

  ctx.estado = 'menu';
  ctx.tentativas_invalidas = 0;
  atualizarSessao(telefone, ctx);

  // Se o usuário já enviou diretamente um número de 1 a 6 de primeira
  if (conteudo && /^[1-6]$/.test(conteudo.trim())) {
    await tratarMenu(telefone, ctx, conteudo);
  }
}

async function tratarConsentimento(
  telefone: string,
  ctx: ContextoConversa,
  resposta: string,
): Promise<void> {
  const norm = resposta.trim().toLowerCase();

  // Se a pessoa respondeu com um número de 1 a 6 direto
  if (/^[1-6]$/.test(norm)) {
    if (ctx.contato_id) {
      await prisma.consentimento.create({
        data: {
          contato_id: ctx.contato_id,
          versao_texto: VERSAO_CONSENTIMENTO_ATUAL,
          texto_hash: getHashConsentimento(),
          finalidade: 'triagem_atendimento_diagnostico_proposta',
        },
      }).catch(err => console.error('[LGPD] Erro ao salvar consentimento:', err));
    }
    await tratarMenu(telefone, ctx, resposta);
    return;
  }

  const aceitou =
    norm.includes('concordo') ||
    norm === 'aceite_lgpd' ||
    norm === 'sim' ||
    norm === 'aceito' ||
    norm === 'ok' ||
    norm === 'pode ser';

  const pediuHumano =
    norm.includes('falar com atendente') ||
    norm.includes('falar_atendente') ||
    norm.includes('atendente') ||
    norm.includes('especialista') ||
    norm.includes('consultor') ||
    norm === 'falar_especialista';

  if (aceitou) {
    if (ctx.contato_id) {
      await prisma.consentimento.create({
        data: {
          contato_id: ctx.contato_id,
          versao_texto: VERSAO_CONSENTIMENTO_ATUAL,
          texto_hash: getHashConsentimento(),
          finalidade: 'triagem_atendimento_diagnostico_proposta',
        },
      }).catch(err => console.error('[LGPD] Erro ao salvar consentimento:', err));
    }

    await responderEGravar(telefone, ctx, MENSAGENS.MENU_TRIAGEM);
    ctx.estado = 'menu';
    ctx.tentativas_invalidas = 0;
    atualizarSessao(telefone, ctx);
  } else if (pediuHumano) {
    await iniciarTransbordo(telefone, ctx);
  } else {
    ctx.tentativas_invalidas++;
    if (ctx.tentativas_invalidas >= MAX_TENTATIVAS_INVALIDAS) {
      await iniciarTransbordo(telefone, ctx);
    } else {
      await responderEGravar(telefone, ctx, MENSAGENS.ERRO_OPCAO);
    }
    atualizarSessao(telefone, ctx);
  }
}

async function tratarMenu(
  telefone: string,
  ctx: ContextoConversa,
  resposta: string,
): Promise<void> {
  const norm = resposta.trim().toLowerCase();

  // Trigger Oficial de Diagnóstico ou Opções 1 a 4: Direcionamento para Ficha Inteligente
  const opcaoDiagnosticoTrigger = verificarTriggerDiagnostico(resposta);
  const opcao1 = norm === '1' || norm.includes('empresa está regular') || norm.includes('regular') || norm.includes('regularidade');
  const opcao2 = norm === '2' || norm.includes('renovar') || norm.includes('documentos') || norm.includes('pgr') || norm.includes('pcmso') || norm.includes('ltcat');
  const opcao3 = norm === '3' || norm.includes('aso') || norm.includes('exame') || norm.includes('admissional') || norm.includes('demissional') || norm.includes('periodico');
  const opcao4 = norm === '4' || norm.includes('esocial') || norm.includes('ppp') || norm.includes('cat');

  // Opção 5: Já é cliente
  const opcao5 = norm === '5' || norm.includes('já sou cliente') || norm.includes('ja sou cliente') || norm.includes('suporte');

  // Opção 6: Falar com especialista
  const opcao6 = norm === '6' || norm.includes('falar com') || norm.includes('consultor') || norm.includes('especialista') || norm.includes('humano') || norm.includes('atendente');

  if (opcaoDiagnosticoTrigger || opcao1 || opcao2 || opcao3 || opcao4) {
    let intencaoTitulo = opcaoDiagnosticoTrigger ? 'Diagnóstico Completo da Empresa' : 'Diagnóstico SST';
    if (opcao1) intencaoTitulo = 'Regularidade da Empresa';
    if (opcao2) intencaoTitulo = 'Documentos de SST (PGR/PCMSO)';
    if (opcao3) intencaoTitulo = 'Exames Ocupacionais e ASO';
    if (opcao4) intencaoTitulo = 'eSocial SST / PPP / CAT';

    if (ctx.nome) {
      await criarLeadEFicha(telefone, ctx, intencaoTitulo);
    } else {
      (ctx as any).intencaoPendente = intencaoTitulo;
      ctx.estado = 'nome';
      await responderEGravar(telefone, ctx, MENSAGENS.PEDIR_NOME);
      atualizarSessao(telefone, ctx);
    }
  } else if (opcao5) {
    await responderEGravar(
      telefone,
      ctx,
      'Perfeito! Que bom falar com você novamente. Vou encaminhar seu atendimento para a nossa equipe de suporte e relacionamento com clientes da CET! 🤝',
    );
    await iniciarTransbordo(telefone, ctx);
  } else if (opcao6) {
    await iniciarTransbordo(telefone, ctx);
  } else {
    // Se a pessoa apenas enviou uma saudação comum de novo, envia o menu sem erro
    const saudacao = ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'opa'].includes(norm);
    if (saudacao) {
      await responderEGravar(telefone, ctx, MENSAGENS.MENU_TRIAGEM);
      return;
    }

    // Se for uma dúvida, pergunta ou frase livre, responde com o Google Gemini inteligente da CET
    try {
      let protocolo: string | undefined;
      if (ctx.lead_id) {
        const leadDb = await prisma.lead.findUnique({ where: { id: ctx.lead_id } });
        protocolo = leadDb?.protocolo;
      }

      const respostaIA = await gerarRespostaGeminiCET(resposta, {
        nomeCliente: ctx.nome,
        protocolo,
        linkFicha: ctx.ficha_token ? linkCurtoFicha(ctx.ficha_token) : undefined,
      });

      if (respostaIA) {
        await responderEGravar(telefone, ctx, respostaIA);
        ctx.tentativas_invalidas = 0;
        atualizarSessao(telefone, ctx);
        return;
      }
    } catch (err) {
      console.error('[Orquestrador] Erro ao consultar Gemini:', err);
    }

    ctx.tentativas_invalidas++;
    if (ctx.tentativas_invalidas >= MAX_TENTATIVAS_INVALIDAS) {
      await iniciarTransbordo(telefone, ctx);
    } else {
      await responderEGravar(telefone, ctx, MENSAGENS.ERRO_OPCAO);
    }
    atualizarSessao(telefone, ctx);
  }
}

async function tratarNome(
  telefone: string,
  ctx: ContextoConversa & { intencaoPendente?: string },
  nome: string,
): Promise<void> {
  const nomeFormatado = nome.trim();
  if (nomeFormatado.length < 2 || nomeFormatado.length > 100) {
    ctx.tentativas_invalidas++;
    if (ctx.tentativas_invalidas >= MAX_TENTATIVAS_INVALIDAS) {
      await iniciarTransbordo(telefone, ctx);
    } else {
      await responderEGravar(telefone, ctx, 'Por favor, informe seu *nome completo* para prosseguirmos: 😊');
    }
    atualizarSessao(telefone, ctx);
    return;
  }

  ctx.nome = nomeFormatado;
  ctx.tentativas_invalidas = 0;

  // Criar ou atualizar contato no banco com consentimento LGPD
  let contato = await prisma.contato.findUnique({
    where: { telefone_e164: telefone },
  });

  if (!contato) {
    contato = await prisma.contato.create({
      data: {
        nome: nomeFormatado,
        telefone_e164: telefone,
        canal_preferido: 'whatsapp',
        consentimentos: {
          create: {
            versao_texto: VERSAO_CONSENTIMENTO_ATUAL,
            texto_hash: getHashConsentimento(),
            finalidade: 'triagem_atendimento_diagnostico_proposta',
          },
        },
      },
    });
  } else {
    contato = await prisma.contato.update({
      where: { id: contato.id },
      data: { nome: nomeFormatado },
    });
  }

  ctx.contato_id = contato.id;

  const intencao = ctx.intencaoPendente || 'Diagnóstico SST';
  await criarLeadEFicha(telefone, ctx, intencao);
}

async function criarLeadEFicha(
  telefone: string,
  ctx: ContextoConversa,
  intencao: string,
): Promise<void> {
  const protocolo = gerarProtocolo();

  let contatoId = ctx.contato_id;
  if (!contatoId) {
    const contato = await prisma.contato.upsert({
      where: { telefone_e164: telefone },
      create: {
        nome: ctx.nome || 'Cliente CET',
        telefone_e164: telefone,
        canal_preferido: 'whatsapp',
      },
      update: {
        nome: ctx.nome || undefined,
      },
    });
    contatoId = contato.id;
    ctx.contato_id = contato.id;
  }

  let lead = ctx.lead_id
    ? await prisma.lead.findUnique({ where: { id: ctx.lead_id }, include: { fichas: true } })
    : null;

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        contato_id: contatoId,
        canal: 'whatsapp',
        primeira_intencao: intencao,
        protocolo,
        fichas: {
          create: {
            status: 'iniciada',
            bloco_atual: 1,
            respostas: {},
          },
        },
      },
      include: {
        fichas: true,
      },
    });
  } else {
    await prisma.lead
      .update({
        where: { id: lead.id },
        data: { primeira_intencao: intencao },
      })
      .catch(() => {});
  }

  const leadId = lead?.id || ctx.lead_id || 'lead-temp';
  let ficha = lead?.fichas?.[0];
  if (!ficha) {
    ficha = await prisma.ficha.create({
      data: {
        lead_id: leadId,
        status: 'iniciada',
        bloco_atual: 1,
        respostas: {},
      },
    });
  }

  const tokenRetomada = ficha?.token_retomada || 'token-fallback';
  ctx.lead_id = leadId;
  ctx.ficha_token = tokenRetomada;
  ctx.estado = 'ficha_criada';
  ctx.tentativas_invalidas = 0;
  atualizarSessao(telefone, ctx);

  const link = linkCurtoFicha(tokenRetomada);

  // Direcionamento para a Ficha Inteligente com tom acolhedor
  const msg = MENSAGENS.FICHA_CRIADA
    .replace('{{nome}}', ctx.nome || 'cliente')
    .replace('{{protocolo}}', lead.protocolo || protocolo)
    .replace('{{link_ficha}}', link);

  await responderEGravar(telefone, ctx, msg);
}

async function tratarIntencao(
  telefone: string,
  ctx: ContextoConversa,
  intencao: string,
): Promise<void> {
  await tratarMenu(telefone, ctx, intencao);
}

async function tratarPosFicha(
  telefone: string,
  ctx: ContextoConversa,
  resposta: string,
): Promise<void> {
  const norm = resposta.trim().toLowerCase();

  if (norm === '1' || norm.includes('continuar') || norm.includes('preenchimento') || norm.includes('formulario') || norm.includes('link')) {
    if (ctx.ficha_token) {
      const link = linkCurtoFicha(ctx.ficha_token);
      await responderEGravar(telefone, ctx, `Aqui está o link para continuar seu preenchimento:\n👉 ${link}`);
    } else {
      await tratarInicio(telefone, ctx);
    }
  } else if (norm === '2' || norm === '6' || norm.includes('especialista') || norm.includes('falar com') || norm.includes('humano') || norm.includes('atendente') || norm.includes('consultor')) {
    await iniciarTransbordo(telefone, ctx);
  } else if (norm.includes('essencial') || norm.includes('completo')) {
    await responderEGravar(
      telefone,
      ctx,
      'Perfeito! Gerando link seguro para o diagnóstico escolhido via Asaas (PIX ou Cartão)...',
    );
  } else {
    if (ctx.ficha_token) {
      await responderEGravar(telefone, ctx, MENSAGENS.FICHA_INCOMPLETA);
    } else {
      ctx.estado = 'inicio';
      await tratarInicio(telefone, ctx);
    }
  }
}

async function acionarRotaA(
  telefone: string,
  ctx: ContextoConversa,
  motivo?: string,
): Promise<void> {
  const protocolo = ctx.lead_id
    ? (await prisma.lead.findUnique({ where: { id: ctx.lead_id } }))?.protocolo || gerarProtocolo()
    : gerarProtocolo();

  ctx.estado = 'transbordo';
  atualizarSessao(telefone, ctx);

  if (ctx.lead_id) {
    await prisma.lead
      .update({
        where: { id: ctx.lead_id },
        data: {
          primeira_intencao: `ROTA A URGENTE (SLA 10min): ${motivo || 'Gatilho Crítico'}`,
        },
      })
      .catch(() => {});
  }

  const msg = MENSAGENS.ROTA_A_TRANSBORDO.replace('{{protocolo}}', protocolo);
  await responderEGravar(telefone, ctx, msg);

  console.warn(`[ROTA A - URGÊNCIA] Transferência imediata (SLA 10min) para ${telefone}. Protocolo: ${protocolo}. Motivo: ${motivo}`);
}

async function iniciarTransbordo(telefone: string, ctx: ContextoConversa): Promise<void> {
  const protocolo = ctx.lead_id
    ? (await prisma.lead.findUnique({ where: { id: ctx.lead_id } }))?.protocolo || gerarProtocolo()
    : gerarProtocolo();

  ctx.estado = 'transbordo';
  atualizarSessao(telefone, ctx);

  if (ctx.lead_id) {
    await prisma.lead
      .update({
        where: { id: ctx.lead_id },
        data: {
          primeira_intencao: 'Solicitação de Atendimento Humano (Transbordo)',
        },
      })
      .catch(() => {});
  }

  if (dentroDoHorarioComercial()) {
    const msg = MENSAGENS.TRANSBORDO_PADRAO.replace('{{protocolo}}', protocolo);
    await responderEGravar(telefone, ctx, msg);
  } else {
    let msg: string = MENSAGENS.HORARIO_FORA;
    if (ctx.ficha_token) {
      const link = linkCurtoFicha(ctx.ficha_token);
      msg = msg.replace('{{link_ficha}}', link);
    } else {
      msg = msg.replace('\n👉 {{link_ficha}}', '');
    }
    await responderEGravar(telefone, ctx, msg);
  }

  console.log(`[Transbordo Humano] ${telefone} | Nome: ${ctx.nome || 'N/A'} | Protocolo: ${protocolo}`);
}

async function obterSessao(telefone: string): Promise<ContextoConversa & { intencaoPendente?: string }> {
  const existente = sessoes.get(telefone);

  if (existente) {
    const agora = new Date();
    const diff = agora.getTime() - existente.ultima_interacao.getTime();
    if (diff < SESSAO_TIMEOUT_MS) {
      existente.ultima_interacao = agora;
      return existente;
    }
  }

  // Fallback no banco para ambientes serverless
  const nova: ContextoConversa & { intencaoPendente?: string } = {
    estado: 'inicio',
    telefone,
    tentativas_invalidas: 0,
    ultima_interacao: new Date(),
  };

  try {
    const contato = await prisma.contato.findUnique({
      where: { telefone_e164: telefone },
      include: {
        leads: {
          orderBy: { criado_em: 'desc' },
          take: 1,
          include: {
            fichas: {
              orderBy: { criado_em: 'desc' },
              take: 1,
            },
            mensagens: {
              orderBy: { criado_em: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (contato && contato.leads.length > 0) {
      const lead = contato.leads[0];
      nova.contato_id = contato.id;
      nova.lead_id = lead.id;
      nova.nome = contato.nome;

      if (lead.fichas && lead.fichas.length > 0) {
        nova.ficha_token = lead.fichas[0].token_retomada;
        if (lead.fichas[0].status !== 'concluida') {
          nova.estado = 'ficha_criada';
        }
      }

      if (lead.atendente_id) {
        nova.estado = 'transbordo';
      }

      // Se a última mensagem de saída foi de pergunta de nome ou menu
      const ultimaMsgSaida = lead.mensagens?.find((m) => m.direcao === 'saida');
      if (ultimaMsgSaida) {
        const txt = ultimaMsgSaida.conteudo || '';
        if (txt.includes('qual é o seu *nome completo*') || txt.includes('nome completo')) {
          nova.estado = 'nome';
          nova.intencaoPendente = lead.primeira_intencao || 'Diagnóstico SST';
        } else if (txt.includes('digite o número da opção') || txt.includes('1 - Saber se minha empresa')) {
          nova.estado = 'menu';
        } else if (txt.includes('preencha este formulário rápido') || txt.includes('/ficha/') || txt.includes('/f/')) {
          nova.estado = 'ficha_criada';
        }
      }
    }
  } catch (err) {
    console.warn('[Orquestrador] Erro ao recuperar sessão do banco:', err);
  }

  sessoes.set(telefone, nova);
  return nova;
}

function criarSessao(telefone: string): ContextoConversa {
  return {
    estado: 'inicio',
    telefone,
    tentativas_invalidas: 0,
    ultima_interacao: new Date(),
  };
}

function atualizarSessao(telefone: string, ctx: ContextoConversa): void {
  ctx.ultima_interacao = new Date();
  sessoes.set(telefone, ctx);
}

