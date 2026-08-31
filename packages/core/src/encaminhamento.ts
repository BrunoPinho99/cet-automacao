import type { ResultadoScoreSST, ResultadoRota, AcaoEncaminhamento } from './types.js';

/**
 * Define as ações de encaminhamento com base no score SST e na classificação de rota.
 * Função pura — sem I/O.
 *
 * Regra: itens críticos (P1) nunca ficam presos em automação.
 * Acidente ou fiscalização → técnico/diretoria imediatamente.
 */
export function definirEncaminhamentos(
  scoreSst: ResultadoScoreSST,
  rota: ResultadoRota,
): AcaoEncaminhamento[] {
  const acoes: AcaoEncaminhamento[] = [];

  // --- Gatilho crítico: escala imediatamente ---
  if (rota.gatilhoCritico) {
    acoes.push({
      destino: 'diretoria',
      urgencia: 'imediata',
      motivo: 'Gatilho crítico: acidente ou fiscalização identificados',
      itens_acionadores: rota.motivos,
    });
    return acoes; // interrompe — diretoria assume o controle
  }

  const problemas: Record<string, string[]> = {};

  // Coleta itens não conformes e não comprovados por eixo
  for (const [eixo, resultado] of Object.entries(scoreSst.por_eixo)) {
    for (const item of resultado.itens) {
      if (item.estado === 'nao_conforme' || item.estado === 'nao_comprovado') {
        if (!problemas[eixo]) problemas[eixo] = [];
        problemas[eixo].push(item.descricao);
      }
    }
  }

  // --- PGR / PCMSO / LTCAT inexistente ou vencido ---
  const docsCriticos = ['pgr_gro', 'pcmso_aso', 'ltcat_lip'];
  const problemasCriticos = docsCriticos.flatMap((e) => problemas[e] ?? []);
  if (problemasCriticos.length > 0) {
    acoes.push({
      destino: 'comercial',
      urgencia: rota.rota === 'A' ? 'imediata' : 'alta',
      motivo: 'Documentos SST obrigatórios ausentes ou vencidos',
      itens_acionadores: problemasCriticos,
    });
    acoes.push({
      destino: 'tecnico',
      urgencia: rota.rota === 'A' ? 'imediata' : 'alta',
      motivo: 'Auditoria cruzada necessária antes de precificação',
      itens_acionadores: problemasCriticos,
    });
  }

  // --- ASOs e exames de medicina ocupacional ---
  const problemasMedicina = problemas['pcmso_aso'] ?? [];
  if (problemasMedicina.length > 0) {
    acoes.push({
      destino: 'medicina_ocupacional',
      urgencia: 'alta',
      motivo: 'ASOs ou exames periódicos em aberto',
      itens_acionadores: problemasMedicina,
    });
  }

  // --- eSocial pendente ---
  const problemasEsocial = problemas['esocial_sst'] ?? [];
  if (problemasEsocial.length > 0) {
    acoes.push({
      destino: 'esocial_sst',
      urgencia: 'alta',
      motivo: 'Eventos eSocial SST não enviados',
      itens_acionadores: problemasEsocial,
    });
  }

  // --- EPI / treinamentos sem evidência ---
  const problemasEpi = problemas['epi_epc_treinamentos'] ?? [];
  if (problemasEpi.length > 0) {
    acoes.push({
      destino: 'seguranca_trabalho',
      urgencia: 'normal',
      motivo: 'EPIs ou treinamentos sem evidência documental',
      itens_acionadores: problemasEpi,
    });
  }

  // --- Múltiplas necessidades: vendedor consultivo ---
  if (acoes.length >= 3 || rota.rota === 'A') {
    acoes.push({
      destino: 'vendedor_consultivo',
      urgencia: rota.rota === 'A' ? 'imediata' : 'alta',
      motivo: 'Múltiplas necessidades identificadas — pacote consultivo',
      itens_acionadores: [`Score SST: ${scoreSst.total} (${scoreSst.classificacao})`, `Rota: ${rota.rota}`],
    });
  }

  return acoes;
}
