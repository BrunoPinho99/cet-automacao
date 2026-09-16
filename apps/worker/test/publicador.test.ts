import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as bullmq from 'bullmq';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';
import { publicarEventosPendentes, startPublicador, stopPublicador } from '../src/publicador';

// Mocks do BullMQ
vi.mock('bullmq', () => {
  return {
    Queue: class {
      async add() { return { id: 'job-123' }; }
      async close() {}
    },
    Worker: class {},
  };
});

vi.mock('ioredis', () => {
  return {
    default: class {
      on = vi.fn();
    }
  };
});

vi.mock('@cet/db', () => {
  return {
    prisma: {
      domainEvent: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    }
  };
});

describe('Publicador de Eventos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(bullmq.Queue.prototype, 'add').mockResolvedValue({ id: 'job-123' } as any);
  });

  afterEach(async () => {
    await stopPublicador();
  });

  it('deve processar eventos pendentes e encaminhar para as filas corretas', async () => {
    const mockEventos = [
      { event_id: 'evt-1', tipo: DomainEvents.PAGAMENTO_CONFIRMADO, payload: { pedido_id: 'ped-1' }, status: 'pendente', tentativas: 0 },
      { event_id: 'evt-2', tipo: DomainEvents.SINCRONIZAR_EMPRESA, payload: { empresaId: 'emp-1' }, status: 'pendente', tentativas: 0 }
    ];

    vi.mocked(prisma.domainEvent.findMany).mockResolvedValue(mockEventos as any);
    vi.mocked(prisma.domainEvent.update).mockResolvedValue({} as any);

    await publicarEventosPendentes();

    expect(prisma.domainEvent.findMany).toHaveBeenCalledWith({
      where: { status: 'pendente' },
      orderBy: { criado_em: 'asc' },
      take: 50,
    });

    expect(prisma.domainEvent.update).toHaveBeenCalledTimes(2);
    expect(prisma.domainEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { event_id: 'evt-1' },
        data: expect.objectContaining({ status: 'processado' })
      })
    );
  });

  it('deve marcar erro e incrementar tentativa quando a fila falhar', async () => {
    const mockEventos = [
      { event_id: 'evt-3', tipo: DomainEvents.PAGAMENTO_CONFIRMADO, payload: { pedido_id: 'ped-3' }, status: 'pendente', tentativas: 0 }
    ];

    vi.mocked(prisma.domainEvent.findMany).mockResolvedValue(mockEventos as any);
    vi.mocked(prisma.domainEvent.update).mockResolvedValue({} as any);

    // Sobrescrever o add no prototype para este teste
    vi.spyOn(bullmq.Queue.prototype, 'add').mockRejectedValueOnce(new Error('Redis connection failed'));

    await publicarEventosPendentes();

    expect(prisma.domainEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { event_id: 'evt-3' },
        data: expect.objectContaining({
          status: 'pendente',
          erro: 'Redis connection failed',
        })
      })
    );
  });
});
