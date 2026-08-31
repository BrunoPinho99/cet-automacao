import type {
  DocumentoInput,
  EstadoConformidade,
  ItemSST,
  ResultadoEixoSST,
  ResultadoScoreSST,
  ConfigScoreSST,
  FichaInput,
  EmpresaInput,
} from './types.js';

// Versão das regras — usada para auditabilidade e recálculo
export const VERSAO_REGRAS_SST = '1.0.0';

const CONFIG_PADRAO: ConfigScoreSST = {
  eixos: {
    pgr_gro:            { peso: 20 },
    pcmso_aso:          { peso: 15 },
    ltcat_lip:          { peso: 15 },
    esocial_sst:        { peso: 15 },
    epi_epc_treinamentos: { peso: 10 },
    ergonomia:          { peso: 10 },
    governanca:         { peso: 10 },
    nrs_especiais:      { peso: 5 },
  },
};

/**
 * Converte o estado de conformidade em valor percentual (0.0 a 1.0).
 *
 * Esta é a distinção conceitual mais importante do sistema:
 * - conforme            = 100% (tem o documento E há evidência)
 * - parcialmente_conforme = 50%
 * - nao_conforme        = 0%  (não tem ou claramente irregular)
 * - nao_comprovado      = 25% provisório (declarou ter, sem evidência)
 * - nao_aplicavel       = excluído do denominador (não conta para o score)
 */
export function conformidadeParaValor(estado: EstadoConformidade): number | null {
  switch (estado) {
    case 'conforme':             return 1.0;
    case 'parcialmente_conforme': return 0.5;
    case 'nao_conforme':         return 0.0;
    case 'nao_comprovado':       return 0.25;
    case 'nao_aplicavel':        return null; // excluído do denominador
  }
}

/**
 * Deriva o estado de conformidade de um documento declarado.
 * Documento declarado como 'sim' sem evidência = nao_comprovado.
 */
export function derivarEstadoDocumento(doc: DocumentoInput | undefined): EstadoConformidade {
  if (!doc || doc.possui === 'nao') return 'nao_conforme';
  if (doc.possui === 'nao_sei') return 'nao_comprovado';

  // Possui === 'sim'
  if (!doc.tem_evidencia) return 'nao_comprovado'; // declarou ter, sem evidência

  // Tem evidência — verificar vencimento
  if (doc.data_vencimento && doc.data_vencimento < new Date()) {
    return 'nao_conforme'; // vencido = não conforme
  }

  if (doc.conteudo_coerente === false) return 'parcialmente_conforme';

  return 'conforme';
}

/**
 * Calcula a pontuação de um eixo excluindo itens não-aplicáveis do denominador.
 * Retorna 100 se todos os itens forem não-aplicáveis (eixo inteiro excluído).
 */
export function calcularPontuacaoEixo(itens: ItemSST[]): {
  pontuacao: number;
  nao_aplicaveis: string[];
} {
  const aplicaveis = itens.filter((i) => i.estado !== 'nao_aplicavel');
  const nao_aplicaveis = itens
    .filter((i) => i.estado === 'nao_aplicavel')
    .map((i) => i.descricao);

  if (aplicaveis.length === 0) {
    return { pontuacao: 100, nao_aplicaveis };
  }

  const soma = aplicaveis.reduce((acc, item) => {
    const valor = conformidadeParaValor(item.estado);
    return acc + (valor ?? 0);
  }, 0);

  const pontuacao = Math.round((soma / aplicaveis.length) * 100);
  return { pontuacao, nao_aplicaveis };
}

function classificar(total: number): ResultadoScoreSST['classificacao'] {
  if (total <= 30) return 'critico';
  if (total <= 60) return 'alto_risco';
  if (total <= 80) return 'atencao';
  return 'regular';
}

/**
 * Calcula o score SST completo.
 *
 * Função pura — sem I/O, sem efeitos colaterais.
 * Recebe empresa, ficha e config. Devolve resultado reproduzível.
 *
 * O recálculo com os mesmos inputs e a mesma versão de regras
 * DEVE produzir exatamente o mesmo resultado.
 */
export function calcularScoreSST(
  empresa: EmpresaInput,
  ficha: FichaInput,
  config: ConfigScoreSST = CONFIG_PADRAO,
): ResultadoScoreSST {
  const docs = ficha.documentos ?? {};
  const por_eixo: Record<string, ResultadoEixoSST> = {};
  const todos_nao_aplicaveis: string[] = [];

  // --- Eixo 1: PGR / GRO e plano de ação ---
  {
    const itens: ItemSST[] = [
      {
        eixo: 'pgr_gro',
        descricao: 'PGR (Programa de Gerenciamento de Riscos)',
        estado: derivarEstadoDocumento(docs['PGR']),
        prioridade: 'P1',
      },
      {
        eixo: 'pgr_gro',
        descricao: 'Plano de ação vinculado ao PGR',
        estado: docs['PGR']?.conteudo_coerente ? 'conforme' : 'nao_comprovado',
        prioridade: 'P1',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['pgr_gro'] = { eixo: 'pgr_gro', peso: config.eixos['pgr_gro']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Eixo 2: PCMSO, ASO e exames ---
  {
    const itens: ItemSST[] = [
      {
        eixo: 'pcmso_aso',
        descricao: 'PCMSO (Programa de Controle Médico de Saúde Ocupacional)',
        estado: derivarEstadoDocumento(docs['PCMSO']),
        prioridade: 'P1',
      },
      {
        eixo: 'pcmso_aso',
        descricao: 'ASOs (Atestados de Saúde Ocupacional) em dia',
        // Inferimos do PCMSO — se tem o programa, assume ASOs existentes mas não comprovados
        estado: docs['PCMSO']?.possui === 'sim' && docs['PCMSO']?.tem_evidencia
          ? 'nao_comprovado'  // precisa ver os ASOs individualmente
          : 'nao_conforme',
        prioridade: 'P1',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['pcmso_aso'] = { eixo: 'pcmso_aso', peso: config.eixos['pcmso_aso']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Eixo 3: LTCAT / LIP e coerência previdenciária ---
  {
    const grau = empresa.grau_risco ?? 1;
    const ltcatAplicavel = grau >= 2; // LTCAT obrigatório a partir do GR2

    const itens: ItemSST[] = [
      {
        eixo: 'ltcat_lip',
        descricao: 'LTCAT (Laudo Técnico das Condições Ambientais do Trabalho)',
        estado: !ltcatAplicavel ? 'nao_aplicavel' : derivarEstadoDocumento(docs['LTCAT']),
        prioridade: 'P1',
      },
      {
        eixo: 'ltcat_lip',
        descricao: 'LIP (Laudo de Insalubridade e Periculosidade)',
        estado: derivarEstadoDocumento(docs['LIP']),
        prioridade: 'P2',
      },
      {
        eixo: 'ltcat_lip',
        descricao: 'Coerência entre LTCAT, PCMSO e PPP',
        estado: docs['LTCAT']?.conteudo_coerente === false ? 'nao_conforme' : 'nao_comprovado',
        prioridade: 'P1',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['ltcat_lip'] = { eixo: 'ltcat_lip', peso: config.eixos['ltcat_lip']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Eixo 4: eSocial SST, PPP e CAT ---
  {
    const itens: ItemSST[] = [
      {
        eixo: 'esocial_sst',
        descricao: 'Eventos S-2240 (condições ambientais) enviados',
        estado: 'nao_comprovado', // sem integração eSocial direta no MVP
        prioridade: 'P1',
      },
      {
        eixo: 'esocial_sst',
        descricao: 'PPP (Perfil Profissiográfico Previdenciário)',
        estado: derivarEstadoDocumento(docs['PPP']),
        prioridade: 'P2',
      },
      {
        eixo: 'esocial_sst',
        descricao: 'CAT (Comunicação de Acidente do Trabalho) quando aplicável',
        estado: ficha.tem_acidente_recente ? 'nao_comprovado' : 'nao_aplicavel',
        prioridade: 'P1',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['esocial_sst'] = { eixo: 'esocial_sst', peso: config.eixos['esocial_sst']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Eixo 5: EPI / EPC, treinamentos e controles ---
  {
    const itens: ItemSST[] = [
      {
        eixo: 'epi_epc_treinamentos',
        descricao: 'Ficha de fornecimento e recibo de EPIs',
        estado: 'nao_comprovado',
        prioridade: 'P2',
      },
      {
        eixo: 'epi_epc_treinamentos',
        descricao: 'Treinamentos NR obrigatórios (NR-6, NR-10, etc.)',
        estado: derivarEstadoDocumento(docs['treinamento']),
        prioridade: 'P2',
      },
      {
        eixo: 'epi_epc_treinamentos',
        descricao: 'Ordem de Serviço (OS) de segurança',
        estado: derivarEstadoDocumento(docs['OS']),
        prioridade: 'P3',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['epi_epc_treinamentos'] = { eixo: 'epi_epc_treinamentos', peso: config.eixos['epi_epc_treinamentos']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Eixo 6: Ergonomia e riscos psicossociais ---
  {
    const itens: ItemSST[] = [
      {
        eixo: 'ergonomia',
        descricao: 'AET (Análise Ergonômica do Trabalho)',
        estado: derivarEstadoDocumento(docs['AET']),
        prioridade: 'P2',
      },
      {
        eixo: 'ergonomia',
        descricao: 'Avaliação de riscos psicossociais (NR-1)',
        estado: 'nao_comprovado',
        prioridade: 'P3',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['ergonomia'] = { eixo: 'ergonomia', peso: config.eixos['ergonomia']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Eixo 7: Governança, evidências e vencimentos ---
  {
    const itens: ItemSST[] = [
      {
        eixo: 'governanca',
        descricao: 'Documentos dentro do prazo de validade',
        estado: 'nao_comprovado',
        prioridade: 'P2',
      },
      {
        eixo: 'governanca',
        descricao: 'Evidências organizadas e acessíveis',
        estado: 'nao_comprovado',
        prioridade: 'P3',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['governanca'] = { eixo: 'governanca', peso: config.eixos['governanca']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Eixo 8: NRs especiais aplicáveis ---
  {
    const grau = empresa.grau_risco ?? 1;
    const nrEspeciaisAplicaveis = grau >= 3;

    const itens: ItemSST[] = [
      {
        eixo: 'nrs_especiais',
        descricao: 'NRs especiais aplicáveis ao setor (ex: NR-10, NR-33, NR-35)',
        estado: !nrEspeciaisAplicaveis ? 'nao_aplicavel' : 'nao_comprovado',
        prioridade: 'P2',
      },
    ];
    const { pontuacao, nao_aplicaveis } = calcularPontuacaoEixo(itens);
    todos_nao_aplicaveis.push(...nao_aplicaveis);
    por_eixo['nrs_especiais'] = { eixo: 'nrs_especiais', peso: config.eixos['nrs_especiais']!.peso, pontuacao_bruta: pontuacao, itens, itens_nao_aplicaveis: nao_aplicaveis };
  }

  // --- Cálculo do total ponderado (excluindo eixos 100% não-aplicáveis) ---
  let soma_ponderada = 0;
  let peso_total = 0;

  for (const [chave, eixo] of Object.entries(por_eixo)) {
    const config_eixo = config.eixos[chave];
    if (!config_eixo) continue;

    // Verifica se todos os itens do eixo são não-aplicáveis
    const todosNaoAplicaveis = eixo.itens.every((i) => i.estado === 'nao_aplicavel');
    if (todosNaoAplicaveis) continue; // exclui do denominador

    soma_ponderada += (eixo.pontuacao_bruta / 100) * config_eixo.peso;
    peso_total += config_eixo.peso;
  }

  // Se peso_total for 0 (todos os eixos não aplicáveis — improvável), retorna 100
  const total = peso_total === 0 ? 100 : Math.round((soma_ponderada / peso_total) * 100);

  return {
    por_eixo,
    total,
    classificacao: classificar(total),
    itens_nao_aplicaveis: todos_nao_aplicaveis,
    versao_regras: VERSAO_REGRAS_SST,
  };
}
