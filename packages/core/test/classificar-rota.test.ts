import { describe, it, expect } from 'vitest';
import { classificarRota } from '../src/classificar-rota.js';
import type { EmpresaInput, FichaInput } from '../src/types.js';

// Empresa base para reutilização
const empresaBase: EmpresaInput = {
  trabalhadores_proprios: 10,
  trabalhadores_terceiros: 0,
  unidades: 1,
  estados_atendidos: ['TO'],
  grau_risco: 2,
  cliente_atual: false,
};

const fichaBase: FichaInput = {
  tem_acidente_recente: false,
  tem_fiscalizacao: false,
  prazo_urgente: false,
};

describe('classificarRota — Casos-ouro', () => {
  // CRITÉRIO DE ACEITE MAIS IMPORTANTE:
  // Qualquer gatilho crítico força a Rota A,
  // independentemente do score ou número de trabalhadores.
  it('INVARIANTE: gatilho crítico (acidente) força Rota A com score baixo', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 5 };
    const ficha: FichaInput = { ...fichaBase, tem_acidente_recente: true };

    const resultado = classificarRota(empresa, ficha);

    expect(resultado.rota).toBe('A');
    expect(resultado.gatilhoCritico).toBe(true);
    expect(resultado.motivos).toContain('acidente de trabalho recente declarado');
  });

  it('INVARIANTE: gatilho crítico (fiscalização) força Rota A com empresa pequena', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 3 };
    const ficha: FichaInput = { ...fichaBase, tem_fiscalizacao: true };

    const resultado = classificarRota(empresa, ficha);

    expect(resultado.rota).toBe('A');
    expect(resultado.gatilhoCritico).toBe(true);
  });

  it('Empresa com 100+ trabalhadores cai em Rota A', () => {
    const empresa: EmpresaInput = {
      ...empresaBase,
      trabalhadores_proprios: 90,
      trabalhadores_terceiros: 10,
    };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('A');
    expect(resultado.gatilhoCritico).toBe(false);
    expect(resultado.slaMinutos).toBe(10);
  });

  it('Empresa com 100 trabalhadores em 2 estados cai em Rota A com SLA de 10 minutos', () => {
    const empresa: EmpresaInput = {
      ...empresaBase,
      trabalhadores_proprios: 100,
      unidades: 1,
      estados_atendidos: ['TO', 'PA'],
    };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('A');
    expect(resultado.slaMinutos).toBe(10);
  });

  it('Empresa com 2+ unidades cai em Rota A', () => {
    const empresa: EmpresaInput = { ...empresaBase, unidades: 2, trabalhadores_proprios: 5 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('A');
  });

  it('Empresa com 3+ estados cai em Rota A', () => {
    const empresa: EmpresaInput = {
      ...empresaBase,
      estados_atendidos: ['TO', 'PA', 'MA'],
      trabalhadores_proprios: 10,
    };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('A');
  });

  it('Empresa com 20 trabalhadores cai em Rota B', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 20 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('B');
    expect(resultado.gatilhoCritico).toBe(false);
  });

  it('Empresa com 99 trabalhadores cai em Rota B', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 99 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('B');
  });

  it('Empresa com 1 trabalhador cai em Rota C', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 1 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('C');
    expect(resultado.gatilhoCritico).toBe(false);
  });

  it('Empresa com 19 trabalhadores cai em Rota C', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 19 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('C');
  });

  it('Cliente atual vai para cliente_atual independentemente do porte', () => {
    const empresa: EmpresaInput = {
      ...empresaBase,
      trabalhadores_proprios: 5,
      cliente_atual: true,
    };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.rota).toBe('cliente_atual');
  });

  it('SLA da Rota A é 10 minutos', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 200 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.slaMinutos).toBe(10);
  });

  it('SLA da Rota B é 120 minutos', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 50 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.slaMinutos).toBe(120);
  });

  it('Resultado inclui lista de motivos não vazia', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 200 };

    const resultado = classificarRota(empresa, fichaBase);

    expect(resultado.motivos.length).toBeGreaterThan(0);
  });

  it('Config customizada é respeitada', () => {
    const empresa: EmpresaInput = { ...empresaBase, trabalhadores_proprios: 150 };
    const configCustom = {
      A: { min_trabalhadores: 200, min_unidades: 3, min_estados: 3, valor_estimado_min: 1_000_000 },
      B: { min_trabalhadores: 50, max_trabalhadores: 199 },
      C: { max_trabalhadores: 49 },
      sla: { A: 5, B: 60, C: 999 },
    };

    // Com config customizada, 150 cai em B (min para A é 200)
    const resultado = classificarRota(empresa, fichaBase, configCustom);

    expect(resultado.rota).toBe('B');
    expect(resultado.slaMinutos).toBe(60);
  });
});
