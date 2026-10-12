/**
 * Máquina de estados e mensagens oficiais da Assistente Digital da CET.
 * 
 * Objetivo:
 * Triagem inicial de clientes no WhatsApp e Instagram, identificar necessidade,
 * coletar consentimento LGPD e direcionar para Ficha Inteligente ou Atendente Humano.
 * 
 * Foco: Eliminar retrabalho e converter o atendimento em uma jornada rastreável.
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

// Mensagens EXATAS padronizadas da Assistente Digital CET
export const MENSAGENS = {
  // 1. Abertura Obrigatória (LGPD + Consentimento)
  ABERTURA_OBRIGATORIA: `Olá! Sou a assistente digital da CET. Vou fazer algumas perguntas rápidas para identificar o que sua empresa precisa e encaminhar você ao setor certo. Seus dados serão usados para atendimento, diagnóstico e proposta. Para continuar, confirme: [CONCORDO] [FALAR COM ATENDENTE].`,

  // 2. Menu de Triagem Inicial (Exato 1 a 6)
  MENU_TRIAGEM: `1- Quero saber se minha empresa está regular.
2- Preciso fazer ou renovar documentos de SST.
3- Preciso de ASO ou exames ocupacionais.
4- Preciso enviar eSocial SST, PPP ou CAT.
5- Já sou cliente e preciso de suporte.
6- Quero falar com um especialista.`,

  // Pedido de Nome (para personalizar o atendimento e ficha)
  PEDIR_NOME: `Para iniciarmos seu cadastro, por favor informe seu *nome completo*:`,

  // Pergunta de intenção complementar (compatibilidade)
  PEDIR_INTENCAO: `Qual é a principal necessidade da sua empresa hoje, {{nome}}?`,

  // 3. Direcionamento para a Ficha Inteligente
  FICHA_CRIADA: `✅ Perfeito, {{nome}}!
Seu atendimento foi registrado com o protocolo *{{protocolo}}*.

📋 Preencha a Ficha Inteligente para avaliarmos CNPJ, porte e unidades da sua empresa:
👉 {{link_ficha}}

Você pode preencher no seu ritmo — seus dados ficam salvos!`,

  // Retomada de Ficha
  RETOMAR_FICHA: `Olá, {{nome}}! Você já tem um atendimento em andamento (protocolo {{protocolo}}).
Acesse o link para continuar de onde parou:
👉 {{link_ficha}}`,

  // Alerta de Ficha Incompleta / Abandono
  FICHA_INCOMPLETA: `Sua avaliação ficou incompleta. Falta pouco para identificar as pendências. [CONTINUAR] [FALAR COM ESPECIALISTA]`,

  // Gatilhos Críticos - Rota A (Transferência Humana Imediata)
  ROTA_A_TRANSBORDO: `Pelo porte da empresa, sua análise será personalizada. Um especialista da CET continuará o atendimento. Protocolo: {{protocolo}}.`,

  // Diagnóstico e Pagamento - Rotas B e C
  OFERTA_DIAGNOSTICO: `Sua triagem está pronta. Escolha: Essencial R$ 19,90 ou Completo R$ 29,90, com prioridades e plano. [ESSENCIAL] [COMPLETO]

💡 *Regra de Crédito:* O valor pago vira crédito integral na contratação de serviços acima de R$ 500 realizados em até 7 dias.`,

  // Pós-Venda e Relatório (após confirmação webhook Asaas)
  RELATORIO_PRONTO: `Seu diagnóstico está pronto. Prioridade: {{prioridade}}. A CET pode regularizar e aplicar o crédito previsto. [QUERO RESOLVER] [FALAR COM TÉCNICO]`,

  // Transbordo genérico
  TRANSBORDO_PADRAO: `Entendido! Estou transferindo seu atendimento para um especialista da equipe CET. Protocolo: {{protocolo}}. Aguarde um instante, por favor.`,

  // Erro de opção
  ERRO_OPCAO: `Por favor, digite o número de 1 a 6 ou confirme [CONCORDO] / [FALAR COM ATENDENTE].`,

  // Fora do horário comercial
  HORARIO_FORA: `⏰ Nosso horário de atendimento com especialistas humanos é de segunda a sexta, das 8h às 18h.
Mas você pode preencher a Ficha Inteligente a qualquer momento:
👉 {{link_ficha}}`,

  // Despedida
  DESPEDIDA: `A CET agradece seu contato! Se precisar de algo mais, basta nos mandar uma mensagem.`,

  // Aliases para compatibilidade de testes existentes
  get BOAS_VINDAS() {
    return this.ABERTURA_OBRIGATORIA;
  },
  get MENU_PRINCIPAL() {
    return this.MENU_TRIAGEM;
  },
  get CONSENTIMENTO() {
    return this.ABERTURA_OBRIGATORIA;
  },
  get TRANSBORDO() {
    return this.TRANSBORDO_PADRAO;
  },
} as const;

// Botões de Consentimento
export const CONSENTIMENTO_BOTOES = [
  { id: 'concordo', titulo: 'CONCORDO' },
  { id: 'falar_atendente', titulo: 'FALAR COM ATENDENTE' },
] as const;

// Menu Inicial de 6 opções oficiais
export const MENU_OPCOES = [
  { id: 'opt_1', numero: '1', titulo: 'Quero saber se minha empresa está regular', rota: 'ficha' },
  { id: 'opt_2', numero: '2', titulo: 'Preciso fazer ou renovar documentos de SST', rota: 'ficha' },
  { id: 'opt_3', numero: '3', titulo: 'Preciso de ASO ou exames ocupacionais', rota: 'ficha' },
  { id: 'opt_4', numero: '4', titulo: 'Preciso enviar eSocial SST, PPP ou CAT', rota: 'ficha' },
  { id: 'opt_5', numero: '5', titulo: 'Já sou cliente e preciso de suporte', rota: 'suporte' },
  { id: 'opt_6', numero: '6', titulo: 'Quero falar com um especialista', rota: 'humano' },
] as const;

// Botões principais (compatibilidade com canais interativos de 3 botões)
export const MENU_BOTOES = [
  { id: 'diagnostico_sst', titulo: 'Diagnóstico SST' },
  { id: 'ja_sou_cliente', titulo: 'Já sou cliente' },
  { id: 'falar_especialista', titulo: 'Falar c/ atendente' },
] as const;

// Lista de intenções estruturada (para menus expansíveis do WhatsApp)
export const INTENCOES = [
  {
    titulo: 'Documentos e Programas',
    itens: [
      { id: 'int_regular', titulo: 'Regularidade da Empresa', descricao: 'Saber se a empresa cumpre todas as NRs' },
      { id: 'int_pgr_pcmso', titulo: 'PGR e PCMSO', descricao: 'Elaborar ou renovar PGR / PCMSO' },
      { id: 'int_ltcat', titulo: 'LTCAT e Laudos', descricao: 'Laudo técnico de condições ambientais' },
    ],
  },
  {
    titulo: 'Saúde e eSocial',
    itens: [
      { id: 'int_aso', titulo: 'ASO / Exames Clínicos', descricao: 'Admissional, periódico, demissional' },
      { id: 'int_esocial', titulo: 'eSocial SST e PPP', descricao: 'Envio de eventos e PPP eletrônico' },
      { id: 'int_outro', titulo: 'Outro assunto', descricao: 'Falar diretamente com um especialista' },
    ],
  },
] as const;

/**
 * Critérios Críticos da Rota A (Transferência Humana Imediata - SLA 10min)
 */
export const CRITERIOS_ROTA_A = {
  MIN_TRABALHADORES: 100,
  MIN_UNIDADES: 2,
  TERMOS_URGENCIA: [
    'acidente',
    'acidente grave',
    'óbito',
    'fiscalização',
    'fiscalizacao',
    'auditor',
    'mte',
    'termo de notificação',
    'notificacao',
    'autuação',
    'interdição',
    'embargo',
    'urgente',
    'processo',
  ],
};

/**
 * Avalia se uma mensagem ou dados da empresa ativam os gatilhos críticos da Rota A.
 */
export function verificarGatilhoRotaA(params: {
  texto?: string;
  trabalhadores?: number;
  unidades?: number;
  multiplosEstados?: boolean;
}): { ativa: boolean; motivo?: string } {
  const { texto, trabalhadores, unidades, multiplosEstados } = params;

  if (trabalhadores && trabalhadores >= CRITERIOS_ROTA_A.MIN_TRABALHADORES) {
    return { ativa: true, motivo: `Empresa possui ${trabalhadores} trabalhadores (>= 100).` };
  }

  if (unidades && unidades >= CRITERIOS_ROTA_A.MIN_UNIDADES) {
    return { ativa: true, motivo: `Empresa possui ${unidades} unidades (>= 2).` };
  }

  if (multiplosEstados) {
    return { ativa: true, motivo: 'Empresa atua em mais de um estado.' };
  }

  if (texto) {
    const textoLimpo = texto.toLowerCase();
    for (const termo of CRITERIOS_ROTA_A.TERMOS_URGENCIA) {
      if (textoLimpo.includes(termo)) {
        return { ativa: true, motivo: `Menção a termo crítico: "${termo}".` };
      }
    }
  }

  return { ativa: false };
}

/**
 * Verifica se estamos dentro do horário comercial (seg-sex, 8h-18h, fuso de Brasília/Araguaína).
 */
export function dentroDoHorarioComercial(): boolean {
  const agora = new Date();
  const horaLocal = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const dia = horaLocal.getUTCDay();
  const hora = horaLocal.getUTCHours();
  return dia >= 1 && dia <= 5 && hora >= 8 && hora < 18;
}

export const MAX_TENTATIVAS_INVALIDAS = 3;
export const SESSAO_TIMEOUT_MS = 30 * 60 * 1000;
