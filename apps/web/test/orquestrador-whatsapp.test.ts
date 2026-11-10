import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MENSAGENS } from '../src/lib/fluxo-conversa';

// Hoisted mocks para o vitest
const { mockPrisma, mockEnviarTexto } = vi.hoisted(() => ({
  mockPrisma: {
    mensagem: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    contato: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    lead: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ficha: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    consentimento: {
      create: vi.fn(),
    },
  },
  mockEnviarTexto: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@cet/db', () => ({
  prisma: mockPrisma,
}));

// Mock do cliente de envio
vi.mock('../src/lib/whatsapp-client', () => ({
  enviarTexto: (...args: any[]) => mockEnviarTexto(...args),
  marcarComoLida: vi.fn().mockResolvedValue(undefined),
}));

// Mock do Gemini
vi.mock('../src/lib/gemini-client', () => ({
  gerarRespostaGeminiCET: vi.fn().mockResolvedValue('Resposta de IA da CET'),
}));

import { processarMensagem, resetarSessao } from '../src/lib/orquestrador-whatsapp';

describe('Orquestrador WhatsApp', () => {
  const TELEFONE = '5563999998888';
  const E164 = '+5563999998888';

  beforeEach(() => {
    vi.clearAllMocks();
    resetarSessao(E164);
    resetarSessao(TELEFONE);
    mockEnviarTexto.mockResolvedValue({ sucesso: true, wamid: 'out.wamid.123' });
    mockPrisma.mensagem.findUnique.mockResolvedValue(null);
    mockPrisma.mensagem.findMany.mockResolvedValue([]);
    mockPrisma.mensagem.create.mockResolvedValue({ id: 'msg-1' });
    mockPrisma.consentimento.create.mockResolvedValue({ id: 'cons-1' });
    mockPrisma.lead.update.mockResolvedValue({ id: 'lead-upd' });
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    mockPrisma.lead.create.mockResolvedValue({ id: 'lead-created', protocolo: 'CET-2026-000000', fichas: [] });
    mockPrisma.contato.update.mockResolvedValue({ id: 'contato-upd' });
    mockPrisma.contato.upsert.mockResolvedValue({ id: 'contato-upsert' });
    mockPrisma.ficha.create.mockResolvedValue({ id: 'ficha-created', token_retomada: 'token-mock' });
    mockPrisma.ficha.findUnique.mockResolvedValue(null);
  });

  it('deve deduplicar e ignorar mensagem com wamid já registrado', async () => {
    mockPrisma.mensagem.findUnique.mockResolvedValueOnce({ id: 'msg-existente', wamid: 'dup.123' });

    await processarMensagem(TELEFONE, 'dup.123', 'text', 'Olá');

    expect(mockPrisma.mensagem.findUnique).toHaveBeenCalledWith({ where: { wamid: 'dup.123' } });
    expect(mockEnviarTexto).not.toHaveBeenCalled();
    expect(mockPrisma.mensagem.create).not.toHaveBeenCalled();
  });

  it('deve cadastrar contato e lead para novo usuário e responder com a inteligência artificial da CET', async () => {
    mockPrisma.contato.findUnique.mockResolvedValueOnce(null);
    mockPrisma.contato.create.mockResolvedValueOnce({
      id: 'contato-novo-1',
      nome: 'Carlos Eduardo',
      telefone_e164: E164,
      leads: [],
    });
    mockPrisma.lead.create.mockResolvedValueOnce({
      id: 'lead-novo-1',
      contato_id: 'contato-novo-1',
      protocolo: 'CET-2026-111111',
      atendente_id: null,
      fichas: [],
    });

    await processarMensagem(TELEFONE, 'wamid.novo.1', 'text', 'Olá', undefined, 'Carlos Eduardo');

    // Garante que contato e lead foram criados
    expect(mockPrisma.contato.create).toHaveBeenCalled();
    expect(mockPrisma.lead.create).toHaveBeenCalled();

    // Garante que a mensagem de entrada foi salva
    expect(mockPrisma.mensagem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lead_id: 'lead-novo-1',
          direcao: 'entrada',
          wamid: 'wamid.novo.1',
          conteudo: 'Olá',
        }),
      }),
    );

    // Garante que a resposta da IA de vendas foi enviada e gravada como saída
    expect(mockEnviarTexto).toHaveBeenCalledWith(E164, 'Resposta de IA da CET');
    expect(mockPrisma.mensagem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lead_id: 'lead-novo-1',
          direcao: 'saida',
          conteudo: 'Resposta de IA da CET',
        }),
      }),
    );
  });

  it('deve acionar Gatilho Crítico - Rota A imediatamente se usuário relatar acidente grave', async () => {
    mockPrisma.contato.findUnique.mockResolvedValueOnce({
      id: 'contato-rota-a',
      nome: 'Diretor Roberto',
      telefone_e164: E164,
      leads: [{ id: 'lead-rota-a', protocolo: 'CET-2026-999888', atendente_id: null, fichas: [] }],
    });
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-rota-a',
      protocolo: 'CET-2026-999888',
    });

    await processarMensagem(
      TELEFONE,
      'wamid.rotaa.1',
      'text',
      'Tivemos um acidente grave fatal na fábrica hoje e fomos notificados pelo fiscal',
    );

    // Deve atualizar a intenção do lead para Rota A Urgente
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-rota-a' },
        data: expect.objectContaining({
          primeira_intencao: expect.stringContaining('ROTA A URGENTE'),
        }),
      }),
    );

    // Deve enviar mensagem de Rota A com o protocolo do lead
    expect(mockEnviarTexto).toHaveBeenCalledWith(
      E164,
      expect.stringContaining('CET-2026-999888'),
    );
  });

  it('deve processar o trigger oficial "quero receber um diagnostico da minha empresa"', async () => {
    mockPrisma.contato.findUnique.mockResolvedValueOnce({
      id: 'contato-diag-1',
      nome: 'Juliana Costa',
      telefone_e164: E164,
      leads: [{ id: 'lead-diag-1', protocolo: 'CET-2026-444555', atendente_id: null, fichas: [] }],
    });
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-diag-1',
      protocolo: 'CET-2026-444555',
      fichas: [],
    });
    mockPrisma.ficha.create.mockResolvedValueOnce({
      id: 'ficha-diag-1',
      token_retomada: 'token-diag-uuid-123',
    });

    await processarMensagem(TELEFONE, 'wamid.trigger.diag', 'text', 'quero receber um diagnostico da minha empresa');

    // Deve criar a ficha técnica
    expect(mockPrisma.ficha.create).toHaveBeenCalled();

    // Deve responder com a mensagem de ficha criada com link curto
    expect(mockEnviarTexto).toHaveBeenCalledWith(
      E164,
      expect.stringContaining('/f/tokendiaguuid123'),
    );
  });

  it('deve respeitar a regra de silêncio quando um atendente humano estiver ativo', async () => {
    mockPrisma.contato.findUnique.mockResolvedValueOnce({
      id: 'contato-humano-1',
      nome: 'Cliente Humano',
      telefone_e164: E164,
      leads: [
        {
          id: 'lead-humano-1',
          protocolo: 'CET-2026-123123',
          atendente_id: 'usuario-consultor-1', // Atendente assumiu a conversa
          fichas: [],
        },
      ],
    });

    await processarMensagem(TELEFONE, 'wamid.humano.1', 'text', 'Vocês ainda estão aí?');

    // Salva a mensagem de entrada para o atendente humano ver no painel
    expect(mockPrisma.mensagem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lead_id: 'lead-humano-1',
          direcao: 'entrada',
          conteudo: 'Vocês ainda estão aí?',
        }),
      }),
    );

    // Robô NÃO envia nenhuma mensagem para não interferir no atendimento humano
    expect(mockEnviarTexto).not.toHaveBeenCalled();
  });

  it('deve responder com IA e oferecer o diagnóstico quando o usuário fizer perguntas livres', async () => {
    mockPrisma.contato.findUnique.mockResolvedValueOnce({
      id: 'contato-duvida-1',
      nome: 'Lucas Silva',
      telefone_e164: E164,
      leads: [{ id: 'lead-duvida-1', protocolo: 'CET-2026-777888', atendente_id: null, fichas: [] }],
    });
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-duvida-1',
      protocolo: 'CET-2026-777888',
      fichas: [],
    });
    mockPrisma.mensagem.findMany.mockResolvedValueOnce([
      { direcao: 'entrada', conteudo: 'Olá', wamid: 'w1' },
      { direcao: 'saida', conteudo: 'Olá! Seja bem-vindo à CET...', wamid: 'w2' },
    ]);

    await processarMensagem(TELEFONE, 'wamid.duvida.1', 'text', 'Quanto custa para fazer o PGR e PCMSO da minha loja?');

    // Deve responder usando a IA da CET
    expect(mockEnviarTexto).toHaveBeenCalledWith(E164, 'Resposta de IA da CET');
    expect(mockPrisma.mensagem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lead_id: 'lead-duvida-1',
          direcao: 'saida',
          conteudo: 'Resposta de IA da CET',
        }),
      }),
    );
  });

  it('deve transferir para especialista (transbordo) quando usuário digitar opção 6', async () => {
    mockPrisma.contato.findUnique.mockResolvedValueOnce({
      id: 'contato-menu-6',
      nome: 'Mariana Lima',
      telefone_e164: E164,
      leads: [{ id: 'lead-menu-6', protocolo: 'CET-2026-666666', atendente_id: null, fichas: [] }],
    });
    mockPrisma.lead.findUnique.mockResolvedValue({
      id: 'lead-menu-6',
      protocolo: 'CET-2026-666666',
    });

    // Usuário digita opção 6
    await processarMensagem(TELEFONE, 'wamid.menu.6', 'text', '6');

    // Deve enviar mensagem de transbordo
    expect(mockEnviarTexto).toHaveBeenCalled();
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-menu-6' },
        data: expect.objectContaining({
          primeira_intencao: expect.stringContaining('Transbordo'),
        }),
      }),
    );
  });
});
