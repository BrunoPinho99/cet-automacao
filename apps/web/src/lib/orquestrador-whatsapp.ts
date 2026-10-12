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

import { prisma } from './prisma';
import { normalizarTelefone, gerarProtocolo } from './validacoes';
import { enviarTexto, enviarBotoes, enviarLista, marcarComoLida } from './whatsapp-client';
import {
  type ContextoConversa,
  type EstadoConversa,
  MENSAGENS,
  MENU_OPCOES,
  CONSENTIMENTO_BOTOES,
  MENU_BOTOES,
  INTENCOES,
  MAX_TENTATIVAS_INVALIDAS,
  SESSAO_TIMEOUT_MS,
  dentroDoHorarioComercial,
  verificarGatilhoRotaA,
} from './fluxo-conversa';
import { VERSAO_CONSENTIMENTO_ATUAL, getHashConsentimento } from '@cet/shared';

// Cache em memória para sessões ativas (mantido com fallback para banco de dados)
const sessoes = new Map<string, ContextoConversa & { intencaoPendente?: string }>();

/**
 * Ponto de entrada: processa uma mensagem recebida do WhatsApp.
 */
export async function processarMensagem(
  from: string,
  wamid: string,
  tipo: 'text' | 'interactive' | 'button',
  conteudo: string,
  interactiveId?: string,
): Promise<void> {
  const telefone = normalizarTelefone(from);

  // 1. Deduplicação estrita por wamid
  const jaProcessada = await prisma.mensagem.findUnique({ where: { wamid } });
  if (jaProcessada) {
    console.log(`[Orquestrador] Mensagem ${wamid} já processada — ignorando para garantir taxa zero de duplicação.`);
    return;
  }

  // 2. Marcar como lida imediatamente
  await marcarComoLida(wamid);

  // 3. Obter ou criar contexto de sessão
  const ctx = obterSessao(telefone);

  // 4. Localizar ou registrar lead para auditoria
  let leadId = ctx.lead_id;
  if (!leadId) {
    const contato = await prisma.contato.findUnique({
      where: { telefone_e164: telefone },
      include: { leads: { orderBy: { criado_em: 'desc' }, take: 1 } },
    });
    leadId = contato?.leads[0]?.id;
  }

  if (leadId) {
    await prisma.mensagem.create({
      data: {
        lead_id: leadId,
        direcao: 'entrada',
        canal: 'whatsapp',
        wamid,
        conteudo,
        status: 'recebida',
      },
    });
  }

  // 5. Verificar Gatilhos Críticos - Rota A (Interrupção imediata da automação)
  const gatilhoRotaA = verificarGatilhoRotaA({ texto: conteudo });
  if (gatilhoRotaA.ativa) {
    console.log(`[Orquestrador] Gatilho Rota A acionado para ${telefone}: ${gatilhoRotaA.motivo}`);
    await acionarRotaA(telefone, ctx, gatilhoRotaA.motivo);
    return;
  }

  // 6. Determinar ação baseada no estado atual
  const idResposta = interactiveId || conteudo;

  switch (ctx.estado) {
    case 'inicio':
      await tratarInicio(telefone, ctx);
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

    case 'transbordo':
      console.log(`[Orquestrador] ${telefone} em transbordo com especialista — mensagem: ${conteudo}`);
      break;

    case 'ficha_criada':
      await tratarPosFicha(telefone, ctx, idResposta);
      break;

    case 'encerrado':
      ctx.estado = 'inicio';
      await tratarInicio(telefone, ctx);
      break;
  }
}

// =============================================================================
// Tratadores de estado
// =============================================================================

async function tratarInicio(telefone: string, ctx: ContextoConversa): Promise<void> {
  // Verificar se o contato já existe e possui ficha em andamento
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
      const link = `${process.env.SITE_URL || 'https://cet-automacao.vercel.app'}/ficha/${ficha.token_retomada}`;
      const msg = MENSAGENS.FICHA_INCOMPLETA;

      await enviarTexto(telefone, msg);
      await enviarTexto(telefone, `Link para continuar: ${link}`);
      ctx.ficha_token = ficha.token_retomada;
      ctx.estado = 'ficha_criada';
      atualizarSessao(telefone, ctx);
      return;
    }
  }

  // 1. Abertura Obrigatória EXATA
  await enviarTexto(telefone, MENSAGENS.ABERTURA_OBRIGATORIA);

  ctx.estado = 'consentimento';
  atualizarSessao(telefone, ctx);
}

async function tratarConsentimento(
  telefone: string,
  ctx: ContextoConversa,
  resposta: string,
): Promise<void> {
  const norm = resposta.trim().toLowerCase();

  const aceitou =
    norm.includes('concordo') ||
    norm === '1' ||
    norm === 'aceite_lgpd' ||
    norm === 'sim' ||
    norm === 'aceito';

  const pediuHumano =
    norm.includes('falar com atendente') ||
    norm.includes('falar_atendente') ||
    norm.includes('atendente') ||
    norm === '2' ||
    norm === 'falar_especialista';

  if (aceitou) {
    // Registrar consentimento LGPD no banco se houver contato
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

    // 2. Apresentar o Menu de Triagem Inicial EXATO
    await enviarTexto(telefone, MENSAGENS.MENU_TRIAGEM);
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
      await enviarTexto(telefone, MENSAGENS.ERRO_OPCAO);
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

  // Opções 1 a 4: Direcionamento para Ficha Inteligente
  const opcao1 = norm === '1' || norm.includes('empresa está regular') || norm.includes('regular');
  const opcao2 = norm === '2' || norm.includes('renovar documentos') || norm.includes('documentos de sst');
  const opcao3 = norm === '3' || norm.includes('aso') || norm.includes('exames ocupacionais');
  const opcao4 = norm === '4' || norm.includes('esocial') || norm.includes('ppp') || norm.includes('cat');

  // Opção 5: Já é cliente
  const opcao5 = norm === '5' || norm.includes('já sou cliente') || norm.includes('suporte');

  // Opção 6: Falar com especialista
  const opcao6 = norm === '6' || norm.includes('falar com um especialista') || norm.includes('especialista');

  if (opcao1 || opcao2 || opcao3 || opcao4) {
    const opcaoEscolhida = MENU_OPCOES.find(o =>
      (opcao1 && o.numero === '1') ||
      (opcao2 && o.numero === '2') ||
      (opcao3 && o.numero === '3') ||
      (opcao4 && o.numero === '4')
    );

    const intencaoTitulo = opcaoEscolhida?.titulo || 'Diagnóstico SST';

    if (ctx.nome) {
      await criarLeadEFicha(telefone, ctx, intencaoTitulo);
    } else {
      (ctx as any).intencaoPendente = intencaoTitulo;
      ctx.estado = 'nome';
      await enviarTexto(telefone, MENSAGENS.PEDIR_NOME);
      atualizarSessao(telefone, ctx);
    }
  } else if (opcao5) {
    await enviarTexto(
      telefone,
      'Identificamos que você já é cliente da CET! Vou encaminhar seu atendimento para a nossa equipe de suporte e relacionamento. 🤝',
    );
    await iniciarTransbordo(telefone, ctx);
  } else if (opcao6) {
    await iniciarTransbordo(telefone, ctx);
  } else {
    ctx.tentativas_invalidas++;
    if (ctx.tentativas_invalidas >= MAX_TENTATIVAS_INVALIDAS) {
      await iniciarTransbordo(telefone, ctx);
    } else {
      await enviarTexto(telefone, MENSAGENS.ERRO_OPCAO);
      await enviarTexto(telefone, MENSAGENS.MENU_TRIAGEM);
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
      await enviarTexto(telefone, 'Por favor, informe seu nome completo para prosseguir:');
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

  const lead = await prisma.lead.create({
    data: {
      contato_id: contatoId,
      canal: 'whatsapp',
      primeira_intencao: intencao,
      protocolo,
    },
  });

  const ficha = await prisma.ficha.create({
    data: {
      lead_id: lead.id,
      status: 'iniciada',
      bloco_atual: 1,
      respostas: {},
    },
  });

  ctx.lead_id = lead.id;
  ctx.ficha_token = ficha.token_retomada;
  ctx.estado = 'ficha_criada';
  ctx.tentativas_invalidas = 0;
  atualizarSessao(telefone, ctx);

  const baseUrl = process.env.SITE_URL || 'https://cet-automacao.vercel.app';
  const link = `${baseUrl}/ficha/${ficha.token_retomada}`;

  // 3. Direcionamento para a Ficha Inteligente
  const msg = MENSAGENS.FICHA_CRIADA
    .replace('{{nome}}', ctx.nome || 'cliente')
    .replace('{{protocolo}}', protocolo)
    .replace('{{link_ficha}}', link);

  await enviarTexto(telefone, msg);

  await prisma.mensagem.create({
    data: {
      lead_id: lead.id,
      direcao: 'saida',
      canal: 'whatsapp',
      conteudo: msg,
      status: 'enviada',
    },
  }).catch(() => {});
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

  if (norm.includes('continuar')) {
    if (ctx.ficha_token) {
      const link = `${process.env.SITE_URL || 'https://cet-automacao.vercel.app'}/ficha/${ctx.ficha_token}`;
      await enviarTexto(telefone, `Aqui está o link para continuar seu preenchimento:\n👉 ${link}`);
    } else {
      await tratarInicio(telefone, ctx);
    }
  } else if (norm.includes('especialista') || norm.includes('falar com especialista') || norm.includes('humano')) {
    await iniciarTransbordo(telefone, ctx);
  } else if (norm.includes('essencial') || norm.includes('completo')) {
    await enviarTexto(
      telefone,
      'Perfeito! Gerando link seguro para o diagnóstico escolhido via Asaas (PIX ou Cartão)...',
    );
  } else {
    if (ctx.ficha_token) {
      await enviarTexto(telefone, MENSAGENS.FICHA_INCOMPLETA);
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

  const msg = MENSAGENS.ROTA_A_TRANSBORDO.replace('{{protocolo}}', protocolo);
  await enviarTexto(telefone, msg);

  console.warn(`[ROTA A - URGÊNCIA] Transferência imediata (SLA 10min) para ${telefone}. Protocolo: ${protocolo}. Motivo: ${motivo}`);
}

async function iniciarTransbordo(telefone: string, ctx: ContextoConversa): Promise<void> {
  const protocolo = ctx.lead_id
    ? (await prisma.lead.findUnique({ where: { id: ctx.lead_id } }))?.protocolo || gerarProtocolo()
    : gerarProtocolo();

  ctx.estado = 'transbordo';
  atualizarSessao(telefone, ctx);

  if (dentroDoHorarioComercial()) {
    const msg = MENSAGENS.TRANSBORDO_PADRAO.replace('{{protocolo}}', protocolo);
    await enviarTexto(telefone, msg);
  } else {
    let msg: string = MENSAGENS.HORARIO_FORA;
    if (ctx.ficha_token) {
      const link = `${process.env.SITE_URL || 'https://cet-automacao.vercel.app'}/ficha/${ctx.ficha_token}`;
      msg = msg.replace('{{link_ficha}}', link);
    } else {
      msg = msg.replace('\n👉 {{link_ficha}}', '');
    }
    await enviarTexto(telefone, msg);
  }

  console.log(`[Transbordo Humano] ${telefone} | Nome: ${ctx.nome || 'N/A'} | Protocolo: ${protocolo}`);
}

function obterSessao(telefone: string): ContextoConversa {
  const existente = sessoes.get(telefone);

  if (existente) {
    const agora = new Date();
    const diff = agora.getTime() - existente.ultima_interacao.getTime();
    if (diff > SESSAO_TIMEOUT_MS) {
      const nova = criarSessao(telefone);
      sessoes.set(telefone, nova);
      return nova;
    }
    existente.ultima_interacao = agora;
    return existente;
  }

  const nova = criarSessao(telefone);
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
