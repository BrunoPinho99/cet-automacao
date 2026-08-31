import type {
  EmpresaInput,
  FichaInput,
  ConfigScoreComercial,
  ResultadoScoreComercial,
} from './types.js';

const CONFIG_PADRAO: ConfigScoreComercial = {
  porte_unidades: 30,
  complexidade: 25,
  urgencia: 20,
  potencial: 15,
  qualidade_dados: 10,
};

function classificarFaixa(total: number): 'alta' | 'media' | 'digital' {
  if (total >= 70) return 'alta';
  if (total >= 45) return 'media';
  return 'digital';
}

/**
 * Calcula o score comercial de 0 a 100.
 * Função pura — sem I/O, sem efeitos colaterais.
 */
export function calcularScoreComercial(
  empresa: EmpresaInput,
  ficha: FichaInput,
  config: ConfigScoreComercial = CONFIG_PADRAO,
): ResultadoScoreComercial {
  const total_trabalhadores =
    (empresa.trabalhadores_proprios ?? 0) + (empresa.trabalhadores_terceiros ?? 0);

  // --- Eixo 1: Porte e unidades (0–30) ---
  let porte_unidades = 0;
  if (total_trabalhadores >= 100) porte_unidades = config.porte_unidades; // 30
  else if (total_trabalhadores >= 50) porte_unidades = Math.round(config.porte_unidades * 0.8); // 24
  else if (total_trabalhadores >= 20) porte_unidades = Math.round(config.porte_unidades * 0.5); // 15
  else if (total_trabalhadores >= 10) porte_unidades = Math.round(config.porte_unidades * 0.3); // 9

  // Bônus por número de unidades
  if (empresa.unidades >= 5) porte_unidades = Math.min(config.porte_unidades, porte_unidades + 5);
  else if (empresa.unidades >= 2) porte_unidades = Math.min(config.porte_unidades, porte_unidades + 2);

  // --- Eixo 2: Complexidade SST (0–25) ---
  let complexidade = 0;
  const grau = empresa.grau_risco ?? 1;
  if (grau === 4) complexidade = config.complexidade; // 25
  else if (grau === 3) complexidade = Math.round(config.complexidade * 0.8); // 20
  else if (grau === 2) complexidade = Math.round(config.complexidade * 0.5); // 12
  else complexidade = Math.round(config.complexidade * 0.2); // 5

  // Bônus por atuação multiestaduais
  if ((empresa.estados_atendidos?.length ?? 0) >= 3) {
    complexidade = Math.min(config.complexidade, complexidade + 5);
  }

  // --- Eixo 3: Urgência (0–20) ---
  let urgencia = 0;
  if (ficha.tem_acidente_recente || ficha.tem_fiscalizacao) {
    urgencia = config.urgencia; // 20
  } else if (ficha.prazo_urgente) {
    urgencia = Math.round(config.urgencia * 0.6); // 12
  }

  // --- Eixo 4: Potencial comercial (0–15) ---
  let potencial = 0;
  if (total_trabalhadores >= 100) potencial = config.potencial; // 15
  else if (total_trabalhadores >= 50) potencial = Math.round(config.potencial * 0.7); // ~10
  else if (total_trabalhadores >= 20) potencial = Math.round(config.potencial * 0.4); // 6
  else potencial = Math.round(config.potencial * 0.1); // 1

  // --- Eixo 5: Qualidade dos dados (0–10) ---
  let qualidade_dados = 0;
  // Tem objetivo definido?
  if (ficha.objetivo_principal && ficha.objetivo_principal.length > 10) qualidade_dados += 4;
  // Tem documentos respondidos?
  const docs = ficha.documentos ?? {};
  const respondidos = Object.keys(docs).length;
  if (respondidos >= 5) qualidade_dados += 4;
  else if (respondidos >= 2) qualidade_dados += 2;
  // Tem grau de risco informado?
  if (empresa.grau_risco) qualidade_dados += 2;

  qualidade_dados = Math.min(config.qualidade_dados, qualidade_dados);

  const total = porte_unidades + complexidade + urgencia + potencial + qualidade_dados;

  return {
    porte_unidades,
    complexidade,
    urgencia,
    potencial,
    qualidade_dados,
    total,
    faixa: classificarFaixa(total),
  };
}
