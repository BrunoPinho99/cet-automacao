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

// Palavras e padrões que ativam o atendimento inicial (evita conversas aleatórias/spam)
export const GATILHOS_ATIVACAO = [
  // Saudações comuns
  'oi', 'ola', 'olá', 'opa', 'bom dia', 'boa tarde', 'boa noite', 'e ai', 'e aí', 'fala', 'salve', 'hello', 'hi',
  // Comerciais e Atendimento
  'atendimento', 'orcamento', 'orçamento', 'proposta', 'tabela', 'preco', 'preço', 'valor', 'valores', 'custo',
  // Termos SST e serviços CET
  'cet', 'sst', 'seguranca', 'segurança', 'medicina', 'trabalho', 'empresa', 'cnpj',
  'pgr', 'pcmso', 'ltcat', 'lip', 'aso', 'exame', 'exames', 'laudo', 'laudos',
  'esocial', 'ppp', 'cat', 'nr', 'treinamento', 'treinamentos', 'regularizar', 'regular',
  'renovar', 'consultoria', 'consultor', 'especialista', 'suporte', 'ajuda', 'duvida', 'dúvida',
  'preciso', 'gostaria', 'quero', 'informacao', 'informação', 'contato', 'cotacao', 'cotação',
  // Números diretos de opção
  '1', '2', '3', '4', '5', '6',
];

export function verificarGatilhoAtivacao(texto: string): boolean {
  if (!texto || typeof texto !== 'string') return false;
  const t = texto.toLowerCase().trim();

  // Opção numérica isolada de 1 a 6
  if (/^[1-6]$/.test(t)) return true;

  return GATILHOS_ATIVACAO.some((g) => {
    if (g.length <= 3) {
      const regex = new RegExp(`(^|\\W)${g}(\\W|$)`, 'i');
      return regex.test(t);
    }
    return t.includes(g);
  });
}

// Mensagens Humanizadas e Acolhedoras da CET (Sem botões, opções numéricas)
export const MENSAGENS = {
  // 1. Abertura Humanizada (com opções de 1 a 6 e consentimento integrado de forma amigável)
  ABERTURA_OBRIGATORIA: `Olá! Tudo bem? Seja muito bem-vindo(a) à CET – Segurança e Medicina do Trabalho! 😊

Estou aqui para te ajudar e agilizar o seu atendimento.

Por favor, digite o número da opção que melhor descreve o que você precisa hoje:

1 - Saber se minha empresa está regular perante o Ministério do Trabalho
2 - Fazer ou renovar documentos de SST (PGR, PCMSO, LTCAT)
3 - Exames ocupacionais e ASO (Admissional, Periódico, Demissional)
4 - Envio de eSocial SST, PPP ou emissão de CAT
5 - Já sou cliente da CET e preciso de suporte
6 - Falar diretamente com um de nossos consultores

_(Ao responder, você autoriza o uso dos dados para atendimento e proposta, conforme a LGPD)._`,

  // 2. Menu de Opções
  MENU_TRIAGEM: `Por favor, digite o número da opção desejada:

1 - Regularidade da empresa
2 - Fazer ou renovar documentos de SST (PGR/PCMSO)
3 - Exames ocupacionais e ASO
4 - eSocial SST, PPP ou CAT
5 - Já sou cliente (suporte)
6 - Falar com especialista`,

  // Pedido de Nome (para personalizar o atendimento e ficha)
  PEDIR_NOME: `Perfeito! Para que a nossa equipe possa preparar sua análise e gerar seu protocolo, qual é o seu *nome completo*?`,

  // Pergunta de intenção complementar (compatibilidade)
  PEDIR_INTENCAO: `Qual é a principal necessidade da sua empresa hoje, {{nome}}?`,

  // 3. Direcionamento para a Ficha Inteligente
  FICHA_CRIADA: `Prazer em falar com você, {{nome}}! Já registrei seu atendimento com o protocolo *{{protocolo}}*. 📋

Para avaliarmos o CNPJ e o que sua empresa realmente precisa (sem burocracia), preencha este formulário rápido:
👉 {{link_ficha}}

Leva menos de 3 minutinhos e você pode preencher direto pelo seu celular. Seus dados ficam salvos automaticamente!

Caso queira falar com um especialista a qualquer momento, basta responder *6* por aqui.`,

  // Retomada de Ficha
  RETOMAR_FICHA: `Olá, {{nome}}! Você já tem um atendimento em andamento (protocolo {{protocolo}}). 😊

Para continuar de onde parou, acesse:
👉 {{link_ficha}}`,

  // Alerta de Ficha Incompleta / Abandono (Sem botões, opções numéricas)
  FICHA_INCOMPLETA: `Olá! Notamos que sua avaliação ficou incompleta. Falta bem pouquinho para identificarmos as pendências da sua empresa!

Digite o número para continuar:
1 - Continuar preenchimento
2 - Falar com especialista`,

  // Gatilhos Críticos - Rota A (Transferência Humana Imediata)
  ROTA_A_TRANSBORDO: `Pelo porte e complexidade da sua empresa, sua análise será personalizada diretamente por nossa equipe sênior da CET. Protocolo: *{{protocolo}}*. Um especialista entrará em contato com você agora mesmo.`,

  // Diagnóstico e Pagamento - Rotas B e C
  OFERTA_DIAGNOSTICO: `Sua triagem foi calculada com sucesso! 🎉

O Diagnóstico Completo de SST para sua empresa está disponível por apenas R$ 19,90 (taxa única).
Inclui plano de ação prioritário, mapa de riscos e checklist de conformidade NR.

Acesse o link seguro para concluir e liberar seu laudo na hora:
👉 {{link_pagamento}}`,

  // Pós-Venda e Relatório (após confirmação webhook Asaas)
  RELATORIO_PRONTO: `Seu diagnóstico da CET está pronto! Prioridade: *{{prioridade}}*.

A CET pode regularizar sua empresa e emitir seus laudos ocupacionais.
Digite:
1 - Quero regularizar minha empresa
2 - Falar com responsável técnico`,

  // Transbordo genérico
  TRANSBORDO_PADRAO: `Combinado! Estou transferindo seu atendimento para um de nossos consultores da equipe CET. 💬

Seu protocolo é *{{protocolo}}*. Aguarde só um instante que já vamos te responder por aqui!`,

  // Erro de opção
  ERRO_OPCAO: `Desculpe, não entendi direitinho! 😅

Por favor, digite apenas o número da opção (de 1 a 6):

1 - Regularidade da empresa
2 - Documentos de SST (PGR/PCMSO)
3 - Exames e ASO
4 - eSocial SST / PPP
5 - Já sou cliente (suporte)
6 - Falar com especialista`,

  // Fora do horário comercial
  HORARIO_FORA: `⏰ Nosso horário de atendimento com consultores humanos é de segunda a sexta, das 8h às 18h.

Mas você pode acessar sua Ficha Inteligente a qualquer momento:
👉 {{link_ficha}}`,

  // Despedida
  DESPEDIDA: `A CET agradece muito o seu contato! Tenha um ótimo dia e conte sempre conosco. Se precisar de algo mais, basta mandar uma mensagem por aqui! 😊`,

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
