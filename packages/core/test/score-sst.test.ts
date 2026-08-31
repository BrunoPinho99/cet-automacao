import { describe, it, expect } from 'vitest';
import {
  calcularScoreSST,
  conformidadeParaValor,
  calcularPontuacaoEixo,
  derivarEstadoDocumento,
  VERSAO_REGRAS_SST,
} from '../src/score-sst.js';
import type { EmpresaInput, FichaInput, ItemSST } from '../src/types.js';

const empresaBase: EmpresaInput = {
  trabalhadores_proprios: 50,
  trabalhadores_terceiros: 0,
  unidades: 1,
  estados_atendidos: ['TO'],
  grau_risco: 3,
  cliente_atual: false,
};

const fichaVazia: FichaInput = {
  documentos: {},
};

describe('conformidadeParaValor', () => {
  it('conforme = 1.0', () => expect(conformidadeParaValor('conforme')).toBe(1.0));
  it('parcialmente_conforme = 0.5', () => expect(conformidadeParaValor('parcialmente_conforme')).toBe(0.5));
  it('nao_conforme = 0.0', () => expect(conformidadeParaValor('nao_conforme')).toBe(0.0));
  it('nao_comprovado = 0.25 (provisório)', () => expect(conformidadeParaValor('nao_comprovado')).toBe(0.25));
  it('CRITÉRIO CENTRAL: nao_aplicavel = null (excluído do denominador)', () => {
    expect(conformidadeParaValor('nao_aplicavel')).toBeNull();
  });
});

describe('derivarEstadoDocumento', () => {
  it('Documento undefined → nao_conforme', () => {
    expect(derivarEstadoDocumento(undefined)).toBe('nao_conforme');
  });
  it('Documento possui=nao → nao_conforme', () => {
    expect(derivarEstadoDocumento({ possui: 'nao' })).toBe('nao_conforme');
  });
  it('Documento possui=nao_sei → nao_comprovado', () => {
    expect(derivarEstadoDocumento({ possui: 'nao_sei' })).toBe('nao_comprovado');
  });
  it('Documento possui=sim sem evidência → nao_comprovado', () => {
    expect(derivarEstadoDocumento({ possui: 'sim', tem_evidencia: false })).toBe('nao_comprovado');
  });
  it('Documento possui=sim com evidência e vencido → nao_conforme', () => {
    expect(derivarEstadoDocumento({
      possui: 'sim',
      tem_evidencia: true,
      data_vencimento: new Date('2020-01-01'),
    })).toBe('nao_conforme');
  });
  it('Documento possui=sim com evidência e conteúdo incoerente → parcialmente_conforme', () => {
    expect(derivarEstadoDocumento({
      possui: 'sim',
      tem_evidencia: true,
      conteudo_coerente: false,
    })).toBe('parcialmente_conforme');
  });
  it('Documento possui=sim com evidência válida → conforme', () => {
    expect(derivarEstadoDocumento({
      possui: 'sim',
      tem_evidencia: true,
      data_vencimento: new Date('2030-01-01'),
      conteudo_coerente: true,
    })).toBe('conforme');
  });
});

describe('calcularPontuacaoEixo — exclusão de não-aplicáveis', () => {
  it('CRITÉRIO CENTRAL: item nao_aplicavel sai do denominador', () => {
    const itens: ItemSST[] = [
      { eixo: 'teste', descricao: 'Item A', estado: 'conforme' },
      { eixo: 'teste', descricao: 'Item B', estado: 'nao_aplicavel' },
      { eixo: 'teste', descricao: 'Item C', estado: 'nao_aplicavel' },
    ];
    const { pontuacao } = calcularPontuacaoEixo(itens);
    // Denominador = 1 (só Item A), e ele é conforme → 100%
    expect(pontuacao).toBe(100);
  });

  it('Todos os itens nao_aplicavel → pontuação 100 (eixo excluído)', () => {
    const itens: ItemSST[] = [
      { eixo: 'teste', descricao: 'Item A', estado: 'nao_aplicavel' },
    ];
    const { pontuacao } = calcularPontuacaoEixo(itens);
    expect(pontuacao).toBe(100);
  });

  it('Mix de estados calcula corretamente excluindo nao_aplicavel', () => {
    const itens: ItemSST[] = [
      { eixo: 'teste', descricao: 'Conforme', estado: 'conforme' },        // 1.0
      { eixo: 'teste', descricao: 'Não conforme', estado: 'nao_conforme' }, // 0.0
      { eixo: 'teste', descricao: 'Não aplicável', estado: 'nao_aplicavel' }, // excluído
    ];
    const { pontuacao } = calcularPontuacaoEixo(itens);
    // (1.0 + 0.0) / 2 = 0.5 → 50
    expect(pontuacao).toBe(50);
  });
});

describe('calcularScoreSST — reprodutibilidade', () => {
  it('CRITÉRIO DE ACEITE: recálculo com mesmos inputs produz resultado idêntico', () => {
    const ficha: FichaInput = {
      documentos: {
        PGR: { possui: 'sim', tem_evidencia: true, conteudo_coerente: true },
        PCMSO: { possui: 'sim', tem_evidencia: false },
        LTCAT: { possui: 'nao' },
      },
    };

    const resultado1 = calcularScoreSST(empresaBase, ficha);
    const resultado2 = calcularScoreSST(empresaBase, ficha);

    expect(resultado1.total).toBe(resultado2.total);
    expect(resultado1.classificacao).toBe(resultado2.classificacao);
    expect(resultado1.versao_regras).toBe(resultado2.versao_regras);
  });

  it('Score com ficha vazia (todos nao_conforme/nao_comprovado) é baixo', () => {
    const resultado = calcularScoreSST(empresaBase, fichaVazia);
    expect(resultado.total).toBeLessThan(50);
    expect(['critico', 'alto_risco']).toContain(resultado.classificacao);
  });

  it('Versão de regras é gravada no resultado', () => {
    const resultado = calcularScoreSST(empresaBase, fichaVazia);
    expect(resultado.versao_regras).toBe(VERSAO_REGRAS_SST);
  });

  it('Lista de não-aplicáveis é retornada', () => {
    const resultado = calcularScoreSST(empresaBase, fichaVazia);
    expect(Array.isArray(resultado.itens_nao_aplicaveis)).toBe(true);
  });

  it('CRITÉRIO: relatório diferencia conforme, não conforme e não comprovado', () => {
    const ficha: FichaInput = {
      documentos: {
        PGR: { possui: 'sim', tem_evidencia: true, conteudo_coerente: true },  // conforme
        PCMSO: { possui: 'sim', tem_evidencia: false },                          // nao_comprovado
        LTCAT: { possui: 'nao' },                                                // nao_conforme
      },
    };

    const resultado = calcularScoreSST(empresaBase, ficha);
    const itens_pgr = resultado.por_eixo['pgr_gro']?.itens ?? [];
    const itens_pcmso = resultado.por_eixo['pcmso_aso']?.itens ?? [];
    const itens_ltcat = resultado.por_eixo['ltcat_lip']?.itens ?? [];

    expect(itens_pgr.some((i) => i.estado === 'conforme')).toBe(true);
    expect(itens_pcmso.some((i) => i.estado === 'nao_comprovado')).toBe(true);
    expect(itens_ltcat.some((i) => i.estado === 'nao_conforme')).toBe(true);
  });

  it('Empresa GR-1: LTCAT marcado como nao_aplicavel e excluído', () => {
    const empresaGr1: EmpresaInput = { ...empresaBase, grau_risco: 1 };
    const resultado = calcularScoreSST(empresaGr1, fichaVazia);

    const ltcatItens = resultado.por_eixo['ltcat_lip']?.itens ?? [];
    const ltcatItem = ltcatItens.find((i) => i.descricao.includes('LTCAT'));
    expect(ltcatItem?.estado).toBe('nao_aplicavel');
    expect(resultado.itens_nao_aplicaveis.some((s) => s.includes('LTCAT'))).toBe(true);
  });
});
