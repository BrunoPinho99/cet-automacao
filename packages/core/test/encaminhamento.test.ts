import { describe, it, expect } from 'vitest';
import { definirEncaminhamentos } from '../src/encaminhamento.js';
import type { ResultadoScoreSST, ResultadoRota } from '../src/types.js';
import { VERSAO_REGRAS_SST } from '../src/score-sst.js';

const rotaBase: ResultadoRota = {
  rota: 'C',
  gatilhoCritico: false,
  motivos: ['Empresa pequena'],
  slaMinutos: 9999,
};

const scoreSstBase: ResultadoScoreSST = {
  por_eixo: {
    pgr_gro: {
      eixo: 'pgr_gro', peso: 20, pontuacao_bruta: 100, itens_nao_aplicaveis: [], itens: [
        { eixo: 'pgr_gro', descricao: 'PGR', estado: 'conforme', prioridade: 'P1' }
      ]
    },
    pcmso_aso: {
      eixo: 'pcmso_aso', peso: 15, pontuacao_bruta: 100, itens_nao_aplicaveis: [], itens: [
        { eixo: 'pcmso_aso', descricao: 'PCMSO', estado: 'conforme', prioridade: 'P1' }
      ]
    },
    epi_epc_treinamentos: {
      eixo: 'epi_epc_treinamentos', peso: 10, pontuacao_bruta: 100, itens_nao_aplicaveis: [], itens: [
        { eixo: 'epi_epc_treinamentos', descricao: 'Treinamentos', estado: 'conforme', prioridade: 'P2' }
      ]
    }
  },
  total: 100,
  classificacao: 'regular',
  itens_nao_aplicaveis: [],
  versao_regras: VERSAO_REGRAS_SST
};

describe('definirEncaminhamentos', () => {
  it('Retorna imediatamente diretoria se houver gatilho crítico', () => {
    const rota = { ...rotaBase, gatilhoCritico: true, motivos: ['acidente'] };
    const acoes = definirEncaminhamentos(scoreSstBase, rota);
    
    expect(acoes).toHaveLength(1);
    expect(acoes[0].destino).toBe('diretoria');
    expect(acoes[0].urgencia).toBe('imediata');
  });

  it('Sem problemas retorna nenhuma ação (ou apenas consultor se for rota A)', () => {
    // Sem problemas = sem encaminhamento extra para Rota C
    const acoes = definirEncaminhamentos(scoreSstBase, rotaBase);
    expect(acoes).toHaveLength(0);

    // Rota A sempre tem vendedor_consultivo
    const rotaA = { ...rotaBase, rota: 'A' as const };
    const acoesA = definirEncaminhamentos(scoreSstBase, rotaA);
    expect(acoesA).toHaveLength(1);
    expect(acoesA[0].destino).toBe('vendedor_consultivo');
    expect(acoesA[0].urgencia).toBe('imediata');
  });

  it('Documentos críticos vencidos encaminham para comercial e técnico', () => {
    const scoreRuim = JSON.parse(JSON.stringify(scoreSstBase));
    scoreRuim.por_eixo.pgr_gro.itens[0].estado = 'nao_conforme';
    
    const acoes = definirEncaminhamentos(scoreRuim, rotaBase);
    
    expect(acoes).toHaveLength(2);
    expect(acoes.some(a => a.destino === 'comercial')).toBe(true);
    expect(acoes.some(a => a.destino === 'tecnico')).toBe(true);
    // Para rota C, urgencia é alta (não imediata)
    expect(acoes.find(a => a.destino === 'comercial')?.urgencia).toBe('alta');
  });

  it('ASOs abertos encaminham para medicina ocupacional', () => {
    const scoreRuim = JSON.parse(JSON.stringify(scoreSstBase));
    scoreRuim.por_eixo.pcmso_aso.itens.push({ eixo: 'pcmso_aso', descricao: 'ASOs abertos', estado: 'nao_comprovado', prioridade: 'P1' });
    
    const acoes = definirEncaminhamentos(scoreRuim, rotaBase);
    expect(acoes.some(a => a.destino === 'medicina_ocupacional')).toBe(true);
  });

  it('eSocial encaminha para esocial_sst', () => {
    const scoreRuim = JSON.parse(JSON.stringify(scoreSstBase));
    scoreRuim.por_eixo.esocial_sst = {
      eixo: 'esocial_sst', peso: 15, pontuacao_bruta: 0, itens_nao_aplicaveis: [], itens: [
        { eixo: 'esocial_sst', descricao: 'Eventos pendentes', estado: 'nao_comprovado', prioridade: 'P1' }
      ]
    };
    
    const acoes = definirEncaminhamentos(scoreRuim, rotaBase);
    expect(acoes.some(a => a.destino === 'esocial_sst')).toBe(true);
  });

  it('EPI sem evidência encaminha para seguranca_trabalho com urgência normal', () => {
    const scoreRuim = JSON.parse(JSON.stringify(scoreSstBase));
    scoreRuim.por_eixo.epi_epc_treinamentos.itens[0].estado = 'nao_comprovado';
    
    const acoes = definirEncaminhamentos(scoreRuim, rotaBase);
    expect(acoes.some(a => a.destino === 'seguranca_trabalho' && a.urgencia === 'normal')).toBe(true);
  });

  it('3 ou mais ações disparam vendedor consultivo automático', () => {
    const scoreRuim = JSON.parse(JSON.stringify(scoreSstBase));
    scoreRuim.por_eixo.pgr_gro.itens[0].estado = 'nao_conforme'; // gera 2 ações
    scoreRuim.por_eixo.epi_epc_treinamentos.itens[0].estado = 'nao_conforme'; // gera 1 ação
    
    const acoes = definirEncaminhamentos(scoreRuim, rotaBase);
    // comercial, tecnico, seguranca_trabalho -> total 3 ações. Isso dispara a 4ª: vendedor_consultivo
    expect(acoes).toHaveLength(4);
    expect(acoes.some(a => a.destino === 'vendedor_consultivo')).toBe(true);
  });
});
