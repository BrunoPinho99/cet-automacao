/**
 * Orquestrador do fluxo conversacional WhatsApp.
 * Processa mensagens recebidas, mantém estado da conversa no banco,
 * e responde com mensagens interativas.
 * 
 * Regras rígidas:
 * 1. Deduplicação de mensagem por wamid (nunca processa a mesma mensagem duas vezes)
 * 2. Deduplicação de contato por telefone E.164
 * 3. Se já tem lead aberto, oferece retomada
 * 4. Máximo 3 tentativas inválidas antes de transbordo
 * 5. Sessão expira após 30 min de inatividade → volta ao menu
 */

import { prisma } from './prisma';
import { normalizarTelefone, gerarProtocolo } from './validacoes';
import { enviarTexto, enviarBotoes, enviarLista, marcarComoLida } from './whatsapp-client';
import {
  type ContextoConversa,
  type EstadoConversa,
  MENSAGENS,
  MENU_BOTOES,
  CONSENTIMENTO_BOTOES,
  INTENCOES,
  MAX_TENTATIVAS_INVALIDAS,
  SESSAO_TIMEOUT_MS,
  dentroDoHorarioComercial,
} from './fluxo-conversa';
import { TEXTO_CONSENTIMENTO_V1, VERSAO_CONSENTIMENTO_ATUAL, getHashConsentimento } from '@cet/shared';

// Cache em memória para sessões ativas (em produção, usar Redis)
const sessoes = new Map<string, ContextoConversa>();

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

  // 1. Deduplicação por wamid
  const jaProcessada = await prisma.mensagem.findUnique({ where: { wamid } });
  if (jaProcessada) {
    console.log(`[Orquestrador] Mensagem ${wamid} já processada — ignorando.`);
    return;
  }

  // 2. Marcar como lida imediatamente
  await marcarComoLida(wamid);

  // 3. Obter ou criar contexto de sessão
  const ctx = obterSessao(telefone);

  // 4. Registrar mensagem de entrada
  let leadId = ctx.lead_id;
  if (!leadId) {
    // Buscar lead mais recente do contato
    const contato = await prisma.contato.findUnique({
      where: { telefone_e164: telefone },
      include: { leads: { orderBy: { criado_em: 'desc' }, take: 1 } },
    });
    leadId = contato?.leads[0]?.id;
  }

  // Registrar entrada no banco (log de auditoria)
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

  // 5. Determinar a ação baseada no estado atual
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
      // Em transbordo, mensagens vão direto pro time (nada automático)
      console.log(`[Orquestrador] ${telefone} em transbordo — mensagem: ${conteudo}`);
      break;

    case 'ficha_criada':
    case 'encerrado':
      // Reabrir fluxo
      ctx.estado = 'inicio';
      await tratarInicio(telefone, ctx);
      break;
  }
}

// =============================================================================
// Tratadores de estado
// =============================================================================

async function tratarInicio(telefone: string, ctx: ContextoConversa): Promise<void> {
  // Buscar contato existente
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

    // Se tem ficha aberta, oferecer retomada
    if (lead.fichas.length > 0) {
      const ficha = lead.fichas[0];
      const link = `${process.env.SITE_URL || 'http://localhost:3000'}/ficha/${ficha.token_retomada}`;

      const msg = MENSAGENS.RETOMAR_FICHA
        .replace('{{nome}}', contato.nome)
        .replace('{{protocolo}}', lead.protocolo)
        .replace('{{link_ficha}}', link);

      await enviarTexto(telefone, msg);
      ctx.ficha_token = ficha.token_retomada;
      ctx.estado = 'ficha_criada';
      atualizarSessao(telefone, ctx);
      return;
    }
  }

  // Primeiro contato ou sem lead — enviar boas-vindas + consentimento
  await enviarTexto(telefone, MENSAGENS.BOAS_VINDAS);
  await enviarBotoes(
    telefone,
    MENSAGENS.CONSENTIMENTO,
    [...CONSENTIMENTO_BOTOES],
    'Política de Privacidade',
    'Escolha para continuar',
  );

  ctx.estado = 'consentimento';
  atualizarSessao(telefone, ctx);
}

async function tratarConsentimento(
  telefone: string,
  ctx: ContextoConversa,
  resposta: string,
): Promise<void> {
  if (resposta === 'aceite_lgpd') {
    // Registra o consentimento, se o contato já existe (o que só vai acontecer mais pra frente ou se buscar no banco de novo)
    // Mas aqui o fluxo avança para o menu
    await enviarBotoes(
      telefone,
      MENSAGENS.MENU_PRINCIPAL,
      [...MENU_BOTOES],
      'CET Automação',
      'Escolha para continuar',
    );
    ctx.estado = 'menu';
    atualizarSessao(telefone, ctx);
  } else if (resposta === 'falar_especialista') {
    await iniciarTransbordo(telefone, ctx);
  } else {
    // Erro de opção
    await handleErro(telefone, ctx, MENSAGENS.ERRO_OPCAO);
  }
}

async function tratarMenu(
  telefone: string,
  ctx: ContextoConversa,
  resposta: string,
): Promise<void> {
  switch (resposta) {
    case 'diagnostico_sst':
      if (ctx.nome) {
        // Já sabemos o nome — ir direto para intenção
        ctx.estado = 'intencao';
        await enviarIntencoes(telefone, ctx.nome);
      } else {
        ctx.estado = 'nome';
        await enviarTexto(telefone, MENSAGENS.PEDIR_NOME);
      }
      break;

    case 'falar_especialista':
      await iniciarTransbordo(telefone, ctx);
      break;

    case 'ja_sou_cliente':
      if (ctx.nome) {
        await enviarTexto(
          telefone,
          `Olá, ${ctx.nome}! Vou transferir você para nosso time de atendimento. 🤝`,
        );
      } else {
        await enviarTexto(
          telefone,
          'Vou transferir você para nosso time de atendimento. 🤝',
        );
      }
      await iniciarTransbordo(telefone, ctx);
      break;

    default:
      ctx.tentativas_invalidas++;
      if (ctx.tentativas_invalidas >= MAX_TENTATIVAS_INVALIDAS) {
        await iniciarTransbordo(telefone, ctx);
      } else {
        await enviarTexto(telefone, MENSAGENS.ERRO_OPCAO);
        await enviarBotoes(
          telefone,
          MENSAGENS.MENU_PRINCIPAL,
          [...MENU_BOTOES],
        );
      }
      break;
  }
  atualizarSessao(telefone, ctx);
}

async function tratarNome(
  telefone: string,
  ctx: ContextoConversa,
  nome: string,
): Promise<void> {
  // Validar nome mínimo
  const nomeFormatado = nome.trim();
  if (nomeFormatado.length < 2 || nomeFormatado.length > 100) {
    ctx.tentativas_invalidas++;
    if (ctx.tentativas_invalidas >= MAX_TENTATIVAS_INVALIDAS) {
      await iniciarTransbordo(telefone, ctx);
    } else {
      await enviarTexto(telefone, 'Por favor, informe seu nome completo (mínimo 2 caracteres):');
    }
    atualizarSessao(telefone, ctx);
    return;
  }

  ctx.nome = nomeFormatado;
  ctx.tentativas_invalidas = 0;

  // Criar ou atualizar contato no banco
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
            finalidade: 'diagnostico_sst_whatsapp',
          }
        }
      },
    });
  } else {
    contato = await prisma.contato.update({
      where: { id: contato.id },
      data: { nome: nomeFormatado },
    });
    // Se não tiver consentimento ainda, criamos
    const jaTemConsentimento = await prisma.consentimento.findFirst({
      where: { contato_id: contato.id }
    });
    if (!jaTemConsentimento) {
      await prisma.consentimento.create({
        data: {
          contato_id: contato.id,
          versao_texto: VERSAO_CONSENTIMENTO_ATUAL,
          texto_hash: getHashConsentimento(),
          finalidade: 'diagnostico_sst_whatsapp',
        }
      });
    }
  }

  ctx.contato_id = contato.id;
  ctx.estado = 'intencao';
  atualizarSessao(telefone, ctx);

  await enviarIntencoes(telefone, nomeFormatado);
}

async function tratarIntencao(
  telefone: string,
  ctx: ContextoConversa,
  intencao: string,
): Promise<void> {
  // Mapear IDs de intenção para texto legível
  const todasIntencoes = INTENCOES.flatMap(s => s.itens);
  const intencaoSelecionada = todasIntencoes.find(i => i.id === intencao);

  if (!intencaoSelecionada) {
    ctx.tentativas_invalidas++;
    if (ctx.tentativas_invalidas >= MAX_TENTATIVAS_INVALIDAS) {
      await iniciarTransbordo(telefone, ctx);
      atualizarSessao(telefone, ctx);
      return;
    }
    await enviarTexto(telefone, MENSAGENS.ERRO_OPCAO);
    await enviarIntencoes(telefone, ctx.nome || 'cliente');
    atualizarSessao(telefone, ctx);
    return;
  }

  // Se a intenção é "outro", transbordar
  if (intencao === 'int_outro') {
    await iniciarTransbordo(telefone, ctx);
    atualizarSessao(telefone, ctx);
    return;
  }

  // Criar lead e ficha
  const protocolo = gerarProtocolo();

  const lead = await prisma.lead.create({
    data: {
      contato_id: ctx.contato_id!,
      canal: 'whatsapp',
      primeira_intencao: intencaoSelecionada.titulo,
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

  // Enviar link da ficha
  const link = `${process.env.SITE_URL || 'http://localhost:3000'}/ficha/${ficha.token_retomada}`;

  const msg = MENSAGENS.FICHA_CRIADA
    .replace('{{nome}}', ctx.nome || 'cliente')
    .replace('{{protocolo}}', protocolo)
    .replace('{{link_ficha}}', link);

  await enviarTexto(telefone, msg);

  // Registrar mensagem de saída
  await prisma.mensagem.create({
    data: {
      lead_id: lead.id,
      direcao: 'saida',
      canal: 'whatsapp',
      conteudo: msg,
      status: 'enviada',
    },
  });
}

// =============================================================================
// Utilitários
// =============================================================================

async function enviarIntencoes(telefone: string, nome: string): Promise<void> {
  const corpo = MENSAGENS.PEDIR_INTENCAO.replace('{{nome}}', nome);
  await enviarLista(
    telefone,
    corpo,
    'Ver opções',
    INTENCOES.map(s => ({
      titulo: s.titulo,
      itens: s.itens.map(i => ({
        id: i.id,
        titulo: i.titulo,
        descricao: i.descricao,
      })),
    })),
    'CET Diagnóstico',
  );
}

async function iniciarTransbordo(telefone: string, ctx: ContextoConversa): Promise<void> {
  ctx.estado = 'transbordo';

  if (dentroDoHorarioComercial()) {
    await enviarTexto(telefone, MENSAGENS.TRANSBORDO);
  } else {
    let msg = MENSAGENS.HORARIO_FORA;
    if (ctx.ficha_token) {
      const link = `${process.env.SITE_URL || 'http://localhost:3000'}/ficha/${ctx.ficha_token}`;
      msg = msg.replace('{{link_ficha}}', link);
    } else {
      msg = msg.replace('\n👉 {{link_ficha}}', '');
    }
    await enviarTexto(telefone, msg);
  }

  // Notificar equipe (em produção: enviar para fila, Slack, etc.)
  console.log(`[Transbordo] ${telefone} | Nome: ${ctx.nome || 'N/A'} | Lead: ${ctx.lead_id || 'N/A'}`);
}

function obterSessao(telefone: string): ContextoConversa {
  const existente = sessoes.get(telefone);

  if (existente) {
    // Verificar expiração
    const agora = new Date();
    const diff = agora.getTime() - existente.ultima_interacao.getTime();
    if (diff > SESSAO_TIMEOUT_MS) {
      // Sessão expirada — reiniciar
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
