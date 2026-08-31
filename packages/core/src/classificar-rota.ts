import type {
  EmpresaInput,
  FichaInput,
  ConfigRotas,
  ResultadoRota,
} from './types.js';

const CONFIG_PADRAO: ConfigRotas = {
  A: { min_trabalhadores: 100, min_unidades: 2, min_estados: 2, valor_estimado_min: 500_000 },
  B: { min_trabalhadores: 20, max_trabalhadores: 99 },
  C: { max_trabalhadores: 19 },
  sla: { A: 10, B: 120, C: 9999 },
};

/**
 * Classifica a rota de atendimento de um lead com base na empresa e ficha.
 *
 * REGRA INVARIANTE: Qualquer gatilho crítico força a Rota A,
 * independentemente de qualquer outro fator ou score.
 *
 * Esta função é pura — sem I/O, sem efeitos colaterais.
 * Recebe dados e configuração, devolve resultado determinístico.
 */
export function classificarRota(
  empresa: EmpresaInput,
  ficha: FichaInput,
  config: ConfigRotas = CONFIG_PADRAO,
): ResultadoRota {
  const motivos: string[] = [];
  let gatilhoCritico = false;

  const totalTrabalhadores =
    (empresa.trabalhadores_proprios ?? 0) + (empresa.trabalhadores_terceiros ?? 0);

  // --- Cliente atual: preserva histórico e vai ao gerente de conta ---
  if (empresa.cliente_atual) {
    return {
      rota: 'cliente_atual',
      gatilhoCritico: false,
      motivos: ['empresa identificada como cliente ativo na base'],
      slaMinutos: config.sla.A, // mesmo SLA de A para preservar relacionamento
    };
  }

  // --- GATILHOS CRÍTICOS — forçam Rota A imediatamente ---
  if (ficha.tem_acidente_recente) {
    gatilhoCritico = true;
    motivos.push('acidente de trabalho recente declarado');
  }
  if (ficha.tem_fiscalizacao) {
    gatilhoCritico = true;
    motivos.push('fiscalização em andamento ou iminente');
  }
  if (empresa.riscos_especiais) {
    gatilhoCritico = true;
    motivos.push('presença de riscos especiais/complexidade técnica (ex: espaço confinado, altura)');
  }

  if (gatilhoCritico) {
    return {
      rota: 'A',
      gatilhoCritico: true,
      motivos,
      slaMinutos: config.sla.A,
    };
  }

  // --- CRITÉRIOS DE ROTA A (sem gatilho crítico) ---
  if (totalTrabalhadores >= config.A.min_trabalhadores) {
    motivos.push(`${totalTrabalhadores} trabalhadores (mínimo: ${config.A.min_trabalhadores})`);
  }
  if (empresa.unidades >= config.A.min_unidades) {
    motivos.push(`${empresa.unidades} unidades (mínimo: ${config.A.min_unidades})`);
  }
  if ((empresa.estados_atendidos?.length ?? 0) >= config.A.min_estados) {
    motivos.push(`atuação em ${empresa.estados_atendidos.length} estados`);
  }
  if ((empresa.valor_estimado ?? 0) >= config.A.valor_estimado_min) {
    motivos.push(`valor estimado de projeto alto (>= ${config.A.valor_estimado_min})`);
  }

  if (motivos.length > 0) {
    return {
      rota: 'A',
      gatilhoCritico: false,
      motivos,
      slaMinutos: config.sla.A,
    };
  }

  // --- CRITÉRIOS DE ROTA B ---
  if (
    totalTrabalhadores >= config.B.min_trabalhadores &&
    totalTrabalhadores <= config.B.max_trabalhadores
  ) {
    return {
      rota: 'B',
      gatilhoCritico: false,
      motivos: [`${totalTrabalhadores} trabalhadores (faixa B: ${config.B.min_trabalhadores}–${config.B.max_trabalhadores})`],
      slaMinutos: config.sla.B,
    };
  }

  // --- ROTA C (padrão — jornada digital) ---
  return {
    rota: 'C',
    gatilhoCritico: false,
    motivos: [`${totalTrabalhadores} trabalhadores (faixa C: ≤${config.C.max_trabalhadores})`],
    slaMinutos: config.sla.C,
  };
}
