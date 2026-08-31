// DTOs de transferência entre API e clientes (portal, admin, filas)
// Tipagem sem depender do Prisma Client

export interface EmpresaDto {
  id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  trabalhadores_proprios: number;
  trabalhadores_terceiros: number;
  unidades: number;
  estados_atendidos: string[];
  grau_risco: number | null;
  cidade: string | null;
  uf: string | null;
  cliente_atual: boolean;
  ploomes_id: string | null;
}

export interface ContatoDto {
  id: string;
  empresa_id: string | null;
  nome: string;
  cargo: string | null;
  telefone_e164: string;
  email: string | null;
  canal_preferido: string;
}

export interface LeadDto {
  id: string;
  protocolo: string;
  canal: string;
  empresa_id: string | null;
  contato_id: string;
  campanha: string | null;
  palavra_chave: string | null;
  primeira_intencao: string | null;
  atendente_id: string | null;
  criado_em: string;
}

export interface FichaDto {
  id: string;
  lead_id: string;
  status: string;
  token_retomada: string;
  bloco_atual: number;
  respostas: Record<string, unknown>;
  concluida_em: string | null;
}

export interface ScoreComercialDto {
  id: string;
  ficha_id: string;
  porte_unidades: number;
  complexidade: number;
  urgencia: number;
  potencial: number;
  qualidade_dados: number;
  total: number;
  faixa: string;
  versao_regras: string;
  calculado_em: string;
}

export interface ScoreSstDto {
  id: string;
  ficha_id: string;
  por_eixo: Record<string, unknown>;
  total: number;
  classificacao: string;
  itens_nao_aplicaveis: string[];
  versao_regras: string;
  calculado_em: string;
}

export interface RotaDto {
  id: string;
  ficha_id: string;
  rota: string;
  gatilho_critico: boolean;
  motivos: string[];
  sla_minutos: number;
  responsavel_id: string | null;
  definida_em: string;
}

export interface PedidoDto {
  id: string;
  lead_id: string;
  produto: string;
  valor_centavos: number;
  status: string;
  checkout_url: string | null;
  pago_em: string | null;
}

export interface RelatorioDto {
  id: string;
  pedido_id: string;
  tipo: string;
  arquivo_pdf_key: string;
  gerado_em: string;
  entregue_em: string | null;
  canal_entrega: string | null;
}

// DTO de ficha pública — enviado pelo portal
export interface FichaPublicaDto {
  token_retomada: string;
  status: string;
  bloco_atual: number;
  respostas: Record<string, unknown>;
  empresa: Pick<EmpresaDto, 'cnpj' | 'razao_social' | 'nome_fantasia'> | null;
  contato: Pick<ContatoDto, 'nome' | 'telefone_e164'>;
}
