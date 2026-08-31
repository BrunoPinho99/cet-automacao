import { describe, it, expect } from 'vitest';
import { calcularScoreComercial } from '../src/score-comercial.js';
import type { EmpresaInput, FichaInput } from '../src/types.js';

const empresaBase: EmpresaInput = {
  trabalhadores_proprios: 10,
  trabalhadores_terceiros: 0,
  unidades: 1,
  estados_atendidos: ['TO'],
  grau_risco: 2,
};

const fichaBase: FichaInput = {};

describe('calcularScoreComercial', () => {
  it('Calcula score para empresa pequena (Rota C)', () => {
    const resultado = calcularScoreComercial(empresaBase, fichaBase);
    expect(resultado.porte_unidades).toBe(9); // 30 * 0.3
    expect(resultado.complexidade).toBe(13); // Math.round(25 * 0.5) = 13
    expect(resultado.urgencia).toBe(0);
    expect(resultado.potencial).toBe(2); // Math.round(15 * 0.1) = 2
    expect(resultado.qualidade_dados).toBe(2); // tem grau de risco
    expect(resultado.total).toBe(26); // 9 + 13 + 0 + 2 + 2 = 26
    expect(resultado.faixa).toBe('digital');
  });

  it('Calcula score para empresa grande (Rota A)', () => {
    const empresa = { ...empresaBase, trabalhadores_proprios: 120, unidades: 5, grau_risco: 4, estados_atendidos: ['TO', 'PA', 'MA'] };
    const ficha = { ...fichaBase, tem_acidente_recente: true, objetivo_principal: 'Regularizar tudo', documentos: { PGR: { possui: 'sim' as const }, PCMSO: { possui: 'sim' as const } } };

    const resultado = calcularScoreComercial(empresa, ficha);
    
    expect(resultado.porte_unidades).toBe(30); // max 30, mesmo com bônus de unidades
    expect(resultado.complexidade).toBe(25); // max 25, mesmo com bônus multiestaduais
    expect(resultado.urgencia).toBe(20);
    expect(resultado.potencial).toBe(15);
    expect(resultado.qualidade_dados).toBe(8); // grau risco(2) + objetivo(4) + docs(2)
    
    expect(resultado.total).toBe(98);
    expect(resultado.faixa).toBe('alta');
  });

  it('Urgência é pontuada corretamente (acidente, prazo urgente)', () => {
    const resultadoAcidente = calcularScoreComercial(empresaBase, { ...fichaBase, tem_acidente_recente: true });
    expect(resultadoAcidente.urgencia).toBe(20);

    const resultadoFiscalizacao = calcularScoreComercial(empresaBase, { ...fichaBase, tem_fiscalizacao: true });
    expect(resultadoFiscalizacao.urgencia).toBe(20);

    const resultadoUrgente = calcularScoreComercial(empresaBase, { ...fichaBase, prazo_urgente: true });
    expect(resultadoUrgente.urgencia).toBe(12); // 20 * 0.6
  });

  it('Bônus são aplicados corretamente e respeitam o limite', () => {
    // 50 trabalhadores -> 24 base. +2 de bonus por 2 unidades -> 26
    const empresa1 = { ...empresaBase, trabalhadores_proprios: 50, unidades: 2 };
    expect(calcularScoreComercial(empresa1, fichaBase).porte_unidades).toBe(26);

    // Complexidade: grau 3 -> 20 base. +5 bonus -> 25
    const empresa2 = { ...empresaBase, grau_risco: 3, estados_atendidos: ['TO', 'PA', 'MA'] };
    expect(calcularScoreComercial(empresa2, fichaBase).complexidade).toBe(25);
  });

  it('Faixas corretas baseadas no total', () => {
    // Media 45-69
    const empresaMedia = { ...empresaBase, trabalhadores_proprios: 50, grau_risco: 3 };
    const fichaMedia = { prazo_urgente: true };
    const resultadoMedia = calcularScoreComercial(empresaMedia, fichaMedia);
    expect(resultadoMedia.faixa).toBe('media'); // 24 + 20 + 12 + 10 + 2 = 68
  });

  it('Qualidade de dados pontua documentos preenchidos', () => {
    const fichaDocs5 = { 
      documentos: { 
        PGR: { possui: 'sim' as const }, 
        PCMSO: { possui: 'sim' as const },
        LTCAT: { possui: 'sim' as const },
        PPP: { possui: 'sim' as const },
        ASO: { possui: 'sim' as const }
      } 
    };
    // 4 por ter 5+ documentos, 2 por ter grau de risco na empresa base = 6
    expect(calcularScoreComercial(empresaBase, fichaDocs5).qualidade_dados).toBe(6);
  });
});
