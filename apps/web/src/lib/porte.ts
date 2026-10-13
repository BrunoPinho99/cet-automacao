/**
 * Tradução da classificação interna ("rota" A/B/C) para a linguagem do usuário:
 * Porte da Empresa.
 *
 * O banco continua armazenando os códigos A | B | C | cliente_atual — apenas a
 * apresentação muda, para não quebrar regras de negócio, SLA e integrações.
 */

export type CodigoPorte = 'A' | 'B' | 'C' | 'cliente_atual';

export interface InfoPorte {
  codigo: CodigoPorte | null;
  nome: string;
  descricao: string;
  prazo: string;
  tagClass: string;
}

export const PORTES: Record<CodigoPorte, InfoPorte> = {
  A: {
    codigo: 'A',
    nome: 'Grande porte',
    descricao: '100 ou mais funcionários, ou caso urgente',
    prazo: 'Atender em até 10 minutos',
    tagClass: 'tag-blue-solid',
  },
  B: {
    codigo: 'B',
    nome: 'Médio porte',
    descricao: 'De 20 a 99 funcionários',
    prazo: 'Atender em até 2 horas',
    tagClass: 'tag-blue',
  },
  C: {
    codigo: 'C',
    nome: 'Pequeno porte',
    descricao: 'Até 19 funcionários',
    prazo: 'Atendimento pelo site',
    tagClass: 'tag-green',
  },
  cliente_atual: {
    codigo: 'cliente_atual',
    nome: 'Já é cliente',
    descricao: 'Empresa que já é cliente da CET',
    prazo: 'Atender em até 10 minutos',
    tagClass: 'tag-green-solid',
  },
};

const PORTE_INDEFINIDO: InfoPorte = {
  codigo: null,
  nome: 'Não definido',
  descricao: 'Aguardando o cliente preencher a ficha',
  prazo: '—',
  tagClass: 'tag-neutral',
};

/** Retorna nome, descrição e estilo do porte a partir do código armazenado. */
export function infoPorte(codigo?: string | null): InfoPorte {
  if (!codigo) return PORTE_INDEFINIDO;
  return PORTES[codigo as CodigoPorte] ?? PORTE_INDEFINIDO;
}

/** Sugere o porte com base apenas no número total de funcionários. */
export function sugerirPorte(totalFuncionarios: number): 'A' | 'B' | 'C' {
  if (totalFuncionarios >= 100) return 'A';
  if (totalFuncionarios >= 20) return 'B';
  return 'C';
}

/** Opções para campos de seleção (formulários). */
export const OPCOES_PORTE: Array<{ valor: 'A' | 'B' | 'C'; rotulo: string }> = [
  { valor: 'C', rotulo: 'Pequeno porte — até 19 funcionários' },
  { valor: 'B', rotulo: 'Médio porte — 20 a 99 funcionários' },
  { valor: 'A', rotulo: 'Grande porte — 100 ou mais funcionários' },
];
