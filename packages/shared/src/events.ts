// Eventos de domínio (Outbox Pattern)
// Cada evento tem um tipo único e payload tipado.

export type DomainEventType =
  | 'lead.recebido'
  | 'consentimento.registrado'
  | 'ficha.iniciada'
  | 'ficha.concluida'
  | 'score.calculado'
  | 'rota.definida'
  | 'oferta.exibida'
  | 'checkout.criado'
  | 'pagamento.confirmado'
  | 'pagamento.falhou'
  | 'pagamento.estornado'
  | 'relatorio.gerado'
  | 'relatorio.entregue'
  | 'proposta.enviada'
  | 'proposta.aceita'
  | 'producao.liberada'
  | 'entrega.confirmada'
  | 'renovacao.agendada'
  | 'lead.encaminhado_humano';

export interface DomainEvent<T = Record<string, unknown>> {
  event_id: string;   // UUID único — garante idempotência
  tipo: DomainEventType;
  payload: T;
  criado_em: string;  // ISO 8601
  versao: number;     // para evolução de schema do evento
}

// --- Payloads tipados ---

export interface LeadRecebidoPayload {
  lead_id: string;
  contato_id: string;
  canal: string;
  telefone: string;
  campanha?: string;
}

export interface ConsentimentoRegistradoPayload {
  lead_id: string;
  contato_id: string;
  versao_texto: string;
  aceito_em: string;
}

export interface FichaConcluídaPayload {
  ficha_id: string;
  lead_id: string;
  empresa_id: string;
}

export interface RotaDefinidaPayload {
  rota_id: string;
  ficha_id: string;
  lead_id: string;
  rota: string;
  gatilho_critico: boolean;
  sla_minutos: number;
}

export interface PagamentoConfirmadoPayload {
  pedido_id: string;
  lead_id: string;
  asaas_payment_id: string;
  valor_centavos: number;
  forma_pagamento: string;
  pago_em: string;
}

export interface RelatorioGeradoPayload {
  relatorio_id: string;
  pedido_id: string;
  arquivo_pdf_key: string;
}
