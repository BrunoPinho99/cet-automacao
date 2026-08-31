import { describe, it, expect } from 'vitest';
import { BLOCOS_FICHA, TOTAL_BLOCOS } from '../src/lib/blocos-ficha';

describe('Blocos da Ficha', () => {
  it('deve ter exatamente 5 blocos', () => {
    expect(TOTAL_BLOCOS).toBe(5);
    expect(BLOCOS_FICHA).toHaveLength(5);
  });

  it('blocos devem ter números sequenciais de 1 a 5', () => {
    const numeros = BLOCOS_FICHA.map(b => b.numero);
    expect(numeros).toEqual([1, 2, 3, 4, 5]);
  });

  it('bloco 1 deve conter campo CNPJ obrigatório', () => {
    const bloco1 = BLOCOS_FICHA.find(b => b.numero === 1);
    const campoCnpj = bloco1?.campos.find(c => c.id === 'cnpj');
    expect(campoCnpj).toBeDefined();
    expect(campoCnpj?.obrigatorio).toBe(true);
  });

  it('bloco 2 deve conter campo de trabalhadores', () => {
    const bloco2 = BLOCOS_FICHA.find(b => b.numero === 2);
    const campoTrab = bloco2?.campos.find(c => c.id === 'trabalhadores_proprios');
    expect(campoTrab).toBeDefined();
    expect(campoTrab?.tipo).toBe('numero');
  });

  it('bloco 3 deve conter pelo menos 6 documentos SST', () => {
    const bloco3 = BLOCOS_FICHA.find(b => b.numero === 3);
    expect(bloco3!.campos.length).toBeGreaterThanOrEqual(6);
    // Todos devem ser do tipo select
    bloco3!.campos.forEach(c => {
      expect(c.tipo).toBe('select');
    });
  });

  it('bloco 5 deve conter consentimento LGPD obrigatório', () => {
    const bloco5 = BLOCOS_FICHA.find(b => b.numero === 5);
    const consentimento = bloco5?.campos.find(c => c.id === 'consentimento_lgpd');
    expect(consentimento).toBeDefined();
    expect(consentimento?.obrigatorio).toBe(true);
    expect(consentimento?.tipo).toBe('booleano');
  });

  it('todos os campos devem ter id único globalmente', () => {
    const ids = BLOCOS_FICHA.flatMap(b => b.campos.map(c => c.id));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('cada bloco deve ter título e descrição', () => {
    BLOCOS_FICHA.forEach(bloco => {
      expect(bloco.titulo).toBeTruthy();
      expect(bloco.descricao).toBeTruthy();
    });
  });
});
