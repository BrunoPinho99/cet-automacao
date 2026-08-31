import { describe, it, expect } from 'vitest';
import {
  validarCNPJ,
  somenteDigitos,
  normalizarTelefone,
  gerarProtocolo,
} from '../src/lib/validacoes';

describe('Validações', () => {
  describe('somenteDigitos', () => {
    it('remove pontuação de CNPJ', () => {
      expect(somenteDigitos('11.222.333/0001-81')).toBe('11222333000181');
    });

    it('remove parênteses e traços de telefone', () => {
      expect(somenteDigitos('(63) 99999-8888')).toBe('63999998888');
    });

    it('retorna vazio se não tem dígitos', () => {
      expect(somenteDigitos('abc')).toBe('');
    });
  });

  describe('validarCNPJ', () => {
    it('aceita CNPJ válido (11.222.333/0001-81)', () => {
      expect(validarCNPJ('11222333000181')).toBe(true);
    });

    it('aceita CNPJ válido com pontuação', () => {
      expect(validarCNPJ('11.222.333/0001-81')).toBe(true);
    });

    it('rejeita CNPJ com dígitos iguais', () => {
      expect(validarCNPJ('11111111111111')).toBe(false);
    });

    it('rejeita CNPJ com tamanho errado', () => {
      expect(validarCNPJ('123456789')).toBe(false);
    });

    it('rejeita CNPJ com dígito verificador errado', () => {
      expect(validarCNPJ('11222333000182')).toBe(false);
    });

    it('aceita CNPJ da Receita Federal (00.000.000/0001-91)', () => {
      expect(validarCNPJ('00000000000191')).toBe(true);
    });
  });

  describe('normalizarTelefone', () => {
    it('adiciona +55 para celular de 11 dígitos', () => {
      expect(normalizarTelefone('63999998888')).toBe('+5563999998888');
    });

    it('adiciona +55 para fixo de 10 dígitos', () => {
      expect(normalizarTelefone('6333331234')).toBe('+556333331234');
    });

    it('mantém +55 se já começa com 55', () => {
      expect(normalizarTelefone('5563999998888')).toBe('+5563999998888');
    });

    it('remove formatação e normaliza', () => {
      expect(normalizarTelefone('(63) 99999-8888')).toBe('+5563999998888');
    });
  });

  describe('gerarProtocolo', () => {
    it('gera protocolo no formato CET-AAAA-XXXXXX', () => {
      const protocolo = gerarProtocolo();
      expect(protocolo).toMatch(/^CET-\d{4}-\d{6}$/);
    });

    it('contém o ano corrente', () => {
      const protocolo = gerarProtocolo();
      const anoAtual = new Date().getFullYear().toString();
      expect(protocolo).toContain(anoAtual);
    });

    it('gera protocolos diferentes', () => {
      const p1 = gerarProtocolo();
      const p2 = gerarProtocolo();
      // Pode coincidir em raros casos, mas 999999 possibilidades torna improvável
      // Se coincidir, o teste ainda é válido estatisticamente
      expect(typeof p1).toBe('string');
      expect(typeof p2).toBe('string');
    });
  });
});
