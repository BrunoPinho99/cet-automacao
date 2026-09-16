import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../src/app/api/asaas/route';
import { prisma } from '@cet/db';
import crypto from 'node:crypto';

// Fazemos um mock parcial de @cet/db para injetar falhas e testar a transação
vi.mock('@cet/db', async () => {
  const actual = await vi.importActual('@cet/db');
  return {
    ...actual,
    prisma: {
      ...actual.prisma,
      $transaction: vi.fn(actual.prisma.$transaction),
      pedido: {
        ...actual.prisma.pedido,
        update: vi.fn(actual.prisma.pedido.update),
        findUnique: vi.fn(actual.prisma.pedido.findUnique),
      },
      webhookRecebido: {
        ...actual.prisma.webhookRecebido,
        create: vi.fn(actual.prisma.webhookRecebido.create),
        findUnique: vi.fn(actual.prisma.webhookRecebido.findUnique),
        update: vi.fn(actual.prisma.webhookRecebido.update),
      },
      domainEvent: {
        ...actual.prisma.domainEvent,
        create: vi.fn(actual.prisma.domainEvent.create),
      }
    }
  };
});

describe('Asaas Webhook', () => {
  const webhookSecret = 'test_secret';
  
  beforeEach(() => {
    process.env.ASAAS_WEBHOOK_SECRET = webhookSecret;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRequest(body: any, token: string = webhookSecret) {
    return new Request('http://localhost/api/asaas', {
      method: 'POST',
      headers: {
        'asaas-access-token': token,
      },
      body: JSON.stringify(body),
    });
  }

  it('deve usar prisma.$transaction para garantir atomicidade entre Pedido e DomainEvent', async () => {
    const payload = {
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_12345' },
    };

    vi.mocked(prisma.webhookRecebido.create).mockResolvedValue({} as any);

    const mockPedido = {
      id: 'ped_1',
      lead_id: 'lead_1',
      valor_centavos: 10000,
      status: 'criado',
      asaas_payment_id: 'pay_12345',
    };
    
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue(mockPedido as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue(mockPedido as any);
    vi.mocked(prisma.domainEvent.create).mockResolvedValue({} as any);
    vi.mocked(prisma.webhookRecebido.update).mockResolvedValue({} as any);
    
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      if (Array.isArray(cb)) {
        return Promise.all(cb);
      }
      return cb(prisma);
    });

    const req = createMockRequest(payload);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
  
  it('deve garantir idempotência atômica interceptando erro P2002', async () => {
    const payload = {
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_12345' },
    };

    const p2002Error = new Error('Unique constraint failed');
    (p2002Error as any).code = 'P2002';
    
    vi.mocked(prisma.webhookRecebido.create).mockRejectedValue(p2002Error);

    const req = createMockRequest(payload);
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('already_processed');
  });
});
