/**
 * Máquina de estados do fluxo conversacional WhatsApp.
 * 
 * Estados:
 *   inicio        → Primeiro contato, envia menu principal
 *   menu          → Aguardando escolha do menu
 *   nome          → Pedindo nome do contato
 *   intencao      → Identificando intenção (via lista interativa)
 *   ficha_criada  → Lead + Ficha criados, link enviado
 *   transbordo    → Conversa transferida para humano
 *   encerrado     → Fluxo finalizado
 * 
 * Regra: se o contato já existe (dedup por telefone), pula direto para o menu.
 * Regra: se o contato já tem lead aberto, pergunta se quer continuar.
 */

export type EstadoConversa =
  | 'inicio'
  | 'consentimento'
  | 'menu'
  | 'nome'
  | 'intencao'
  | 'ficha_criada'
  | 'transbordo'
  | 'encerrado';

export interface ContextoConversa {
  estado: EstadoConversa;
  telefone: string;
  nome?: string;
  contato_id?: string;
  lead_id?: string;
  ficha_token?: string;
  tentativas_invalidas: number;
  ultima_interacao: Date;
}

// Mensagens padronizadas do bot
export const MENSAGENS = {
  BOAS_VINDAS: `👋 Olá! Bem-vindo à *CET — Clínica Especializada no Trabalho*!

Somos referência em Saúde e Segurança do Trabalho em Araguaína/TO.`,

  CONSENTIMENTO: `Para seguirmos com o seu atendimento e diagnóstico, precisamos tratar alguns dados da sua empresa. Você concorda com nossa Política de Privacidade?`,

  MENU_PRINCIPAL: `Ótimo! Como posso ajudar você hoje? Escolha uma das opções abaixo:`,

  PEDIR_NOME: `Para iniciarmos, por favor me informe seu *nome completo*:`,

  PEDIR_INTENCAO: `Ótimo, {{nome}}! 😊

Qual o motivo principal do seu contato?`,

  FICHA_CRIADA: `✅ Perfeito, {{nome}}!

Seu atendimento foi registrado com o protocolo *{{protocolo}}*.

📋 Para agilizar o diagnóstico, preencha a ficha da sua empresa neste link:
👉 {{link_ficha}}

Você pode preencher aos poucos — seus dados ficam salvos!`,

  RETOMAR_FICHA: `Olá, {{nome}}! 👋

Você já tem um atendimento em andamento (protocolo *{{protocolo}}*).

📋 Continue o preenchimento da ficha:
👉 {{link_ficha}}`,

  TRANSBORDO: `Entendido! 🤝

Vou transferir você para um dos nossos especialistas. Aguarde um momento, por favor.

📞 Se preferir, ligue para *(63) 3411-XXXX*.`,

  ERRO_OPCAO: `Desculpe, não entendi sua resposta. Por favor, escolha uma das opções do menu.`,

  HORARIO_FORA: `⏰ Nosso horário de atendimento humano é de segunda a sexta, das 8h às 18h.

Mas você pode preencher a ficha a qualquer momento:
👉 {{link_ficha}}`,

  DESPEDIDA: `Obrigado pelo contato! 🙏

Se precisar de algo, estamos à disposição. Até logo! 👋`,
} as const;

// Opções do consentimento
export const CONSENTIMENTO_BOTOES = [
  { id: 'aceite_lgpd', titulo: 'Concordo' },
  { id: 'falar_especialista', titulo: 'Falar com atendente' },
] as const;

export const MENU_BOTOES = [
  { id: 'diagnostico_sst', titulo: 'Diagnóstico SST' },
  { id: 'ja_sou_cliente', titulo: 'Já sou cliente' },
  { id: 'falar_especialista', titulo: 'Falar com atendente' },
] as const;

// Opções de intenção (lista interativa)
export const INTENCOES = [
  {
    titulo: 'Serviços SST',
    itens: [
      { id: 'int_regularizar', titulo: 'Regularizar SST', descricao: 'PGR, PCMSO, LTCAT e outros laudos' },
      { id: 'int_esocial', titulo: 'eSocial SST', descricao: 'Eventos S-2210, S-2220, S-2240' },
      { id: 'int_treinamentos', titulo: 'Treinamentos NRs', descricao: 'CIPA, NR-35, NR-10, NR-33, etc.' },
      { id: 'int_exames', titulo: 'Exames ocupacionais', descricao: 'Admissional, periódico, demissional' },
    ],
  },
  {
    titulo: 'Outros',
    itens: [
      { id: 'int_cotacao', titulo: 'Solicitar cotação', descricao: 'Preciso de um orçamento' },
      { id: 'int_outro', titulo: 'Outro assunto', descricao: 'Algo diferente' },
    ],
  },
] as const;

/**
 * Verifica se estamos dentro do horário comercial (seg-sex, 8h-18h, fuso Araguaína).
 */
export function dentroDoHorarioComercial(): boolean {
  const agora = new Date();
  // Araguaína é UTC-3
  const horaLocal = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const dia = horaLocal.getUTCDay(); // 0=dom, 6=sáb
  const hora = horaLocal.getUTCHours();
  return dia >= 1 && dia <= 5 && hora >= 8 && hora < 18;
}

/**
 * Limite de tentativas inválidas antes de transbordo automático.
 */
export const MAX_TENTATIVAS_INVALIDAS = 3;

/**
 * Tempo de expiração da sessão (30 minutos de inatividade).
 */
export const SESSAO_TIMEOUT_MS = 30 * 60 * 1000;
