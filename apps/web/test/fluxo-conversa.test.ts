import { describe, it, expect, vi } from 'vitest';
import {
  MENSAGENS,
  MENU_BOTOES,
  INTENCOES,
  dentroDoHorarioComercial,
  MAX_TENTATIVAS_INVALIDAS,
  SESSAO_TIMEOUT_MS,
  type ContextoConversa,
} from '../src/lib/fluxo-conversa';

describe('Fluxo Conversacional', () => {
  describe('Mensagens', () => {
    it('deve ter todas as mensagens obrigatórias definidas', () => {
      expect(MENSAGENS.BOAS_VINDAS).toBeTruthy();
      expect(MENSAGENS.MENU_PRINCIPAL).toBeTruthy();
      expect(MENSAGENS.PEDIR_NOME).toBeTruthy();
      expect(MENSAGENS.PEDIR_INTENCAO).toBeTruthy();
      expect(MENSAGENS.FICHA_CRIADA).toBeTruthy();
      expect(MENSAGENS.RETOMAR_FICHA).toBeTruthy();
      expect(MENSAGENS.TRANSBORDO).toBeTruthy();
      expect(MENSAGENS.ERRO_OPCAO).toBeTruthy();
      expect(MENSAGENS.HORARIO_FORA).toBeTruthy();
      expect(MENSAGENS.DESPEDIDA).toBeTruthy();
    });

    it('FICHA_CRIADA deve conter placeholders de nome, protocolo e link', () => {
      expect(MENSAGENS.FICHA_CRIADA).toContain('{{nome}}');
      expect(MENSAGENS.FICHA_CRIADA).toContain('{{protocolo}}');
      expect(MENSAGENS.FICHA_CRIADA).toContain('{{link_ficha}}');
    });

    it('RETOMAR_FICHA deve conter placeholders de nome, protocolo e link', () => {
      expect(MENSAGENS.RETOMAR_FICHA).toContain('{{nome}}');
      expect(MENSAGENS.RETOMAR_FICHA).toContain('{{protocolo}}');
      expect(MENSAGENS.RETOMAR_FICHA).toContain('{{link_ficha}}');
    });

    it('boas-vindas deve mencionar CET', () => {
      expect(MENSAGENS.BOAS_VINDAS).toContain('CET');
    });
  });

  describe('Menu de botões', () => {
    it('deve ter exatamente 3 opções (limite do WhatsApp)', () => {
      expect(MENU_BOTOES).toHaveLength(3);
    });

    it('cada botão deve ter id e título', () => {
      MENU_BOTOES.forEach(botao => {
        expect(botao.id).toBeTruthy();
        expect(botao.titulo).toBeTruthy();
        expect(botao.titulo.length).toBeLessThanOrEqual(20); // Limite do WhatsApp
      });
    });

    it('deve conter opção de diagnóstico SST', () => {
      const diagnostico = MENU_BOTOES.find(b => b.id === 'diagnostico_sst');
      expect(diagnostico).toBeDefined();
    });

    it('deve conter opção de transbordo humano', () => {
      const falar = MENU_BOTOES.find(b => b.id === 'falar_especialista');
      expect(falar).toBeDefined();
    });
  });

  describe('Lista de intenções', () => {
    it('deve ter pelo menos 2 seções', () => {
      expect(INTENCOES.length).toBeGreaterThanOrEqual(2);
    });

    it('cada item deve ter id, título e descrição', () => {
      INTENCOES.forEach(secao => {
        expect(secao.titulo).toBeTruthy();
        secao.itens.forEach(item => {
          expect(item.id).toBeTruthy();
          expect(item.titulo).toBeTruthy();
          expect(item.titulo.length).toBeLessThanOrEqual(24); // Limite do WhatsApp
        });
      });
    });

    it('IDs de intenção devem ser únicos', () => {
      const ids = INTENCOES.flatMap(s => s.itens.map(i => i.id));
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('total de itens não deve exceder 10 por seção (limite do WhatsApp)', () => {
      INTENCOES.forEach(secao => {
        expect(secao.itens.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Controle de sessão', () => {
    it('MAX_TENTATIVAS_INVALIDAS deve ser 3', () => {
      expect(MAX_TENTATIVAS_INVALIDAS).toBe(3);
    });

    it('SESSAO_TIMEOUT_MS deve ser 30 minutos', () => {
      expect(SESSAO_TIMEOUT_MS).toBe(30 * 60 * 1000);
    });
  });

  describe('Horário comercial', () => {
    it('dentroDoHorarioComercial retorna booleano', () => {
      const resultado = dentroDoHorarioComercial();
      expect(typeof resultado).toBe('boolean');
    });
  });
});
