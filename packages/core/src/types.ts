// Tipos de entrada e saída do motor de regras
// Sem dependência de Prisma ou banco de dados

export interface EmpresaInput {
  trabalhadores_proprios: number;
  trabalhadores_terceiros: number;
  unidades: number;
  estados_atendidos: string[];
  grau_risco?: number;
  cliente_atual?: boolean;
  ploomes_id?: string;  // indica cliente atual se presente
  valor_estimado?: number;
  riscos_especiais?: boolean;
}

export interface FichaInput {
  tem_acidente_recente?: boolean;
  tem_fiscalizacao?: boolean;
  prazo_urgente?: boolean;
  objetivo_principal?: string;
  // Documentos declarados por tipo
  documentos?: Record<string, DocumentoInput>;
}

export interface DocumentoInput {
  possui: 'sim' | 'nao' | 'nao_sei';
  data_vencimento?: Date;
  tem_evidencia?: boolean;
  conteudo_coerente?: boolean;  // PGR-PCMSO-LTCAT alinhados
}

export interface ConfigRotas {
  A: { min_trabalhadores: number; min_unidades: number; min_estados: number; valor_estimado_min: number };
  B: { min_trabalhadores: number; max_trabalhadores: number };
  C: { max_trabalhadores: number };
  sla: { A: number; B: number; C: number };
}

export interface ConfigScoreComercial {
  porte_unidades: number;  // peso máximo
  complexidade: number;
  urgencia: number;
  potencial: number;
  qualidade_dados: number;
}

export interface ConfigScoreSST {
  eixos: Record<string, { peso: number }>;
}

// Resultado da classificação de rota
export interface ResultadoRota {
  rota: 'A' | 'B' | 'C' | 'cliente_atual';
  gatilhoCritico: boolean;
  motivos: string[];
  slaMinutos: number;
}

// Resultado do score comercial
export interface ResultadoScoreComercial {
  porte_unidades: number;
  complexidade: number;
  urgencia: number;
  potencial: number;
  qualidade_dados: number;
  total: number;
  faixa: 'alta' | 'media' | 'digital';
}

// Estado de conformidade de um item SST
export type EstadoConformidade =
  | 'conforme'          // 100% — tem o documento e há evidência de conformidade
  | 'parcialmente_conforme' // 50% — tem mas com ressalvas
  | 'nao_conforme'     // 0%  — não tem ou claramente irregular
  | 'nao_comprovado'   // 25% — declarou ter mas sem evidência verificável
  | 'nao_aplicavel';   // excluído do denominador

export interface ItemSST {
  eixo: string;
  descricao: string;
  estado: EstadoConformidade;
  prioridade?: 'P1' | 'P2' | 'P3' | 'P4';
}

export interface ResultadoEixoSST {
  eixo: string;
  peso: number;
  pontuacao_bruta: number;  // 0–100 calculado sobre itens aplicáveis
  itens: ItemSST[];
  itens_nao_aplicaveis: string[];
}

export interface ResultadoScoreSST {
  por_eixo: Record<string, ResultadoEixoSST>;
  total: number;  // 0–100, excluindo não-aplicáveis do denominador
  classificacao: 'critico' | 'alto_risco' | 'atencao' | 'regular';
  itens_nao_aplicaveis: string[];
  versao_regras: string;
}

export interface AcaoEncaminhamento {
  destino: 'comercial' | 'tecnico' | 'medicina_ocupacional' | 'esocial_sst' | 'seguranca_trabalho' | 'diretoria' | 'vendedor_consultivo';
  urgencia: 'imediata' | 'alta' | 'normal';
  motivo: string;
  itens_acionadores: string[];
}
