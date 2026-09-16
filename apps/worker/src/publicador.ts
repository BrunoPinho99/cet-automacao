import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const relatoriosQueue = new Queue('relatorios-fila', { connection });
const ploomesQueue = new Queue('ploomes-fila', { connection });

let isPublishing = false;

export async function publicarEventosPendentes() {
  if (isPublishing) return;
  isPublishing = true;

  try {
    // Busca até 50 eventos pendentes, ordenados pelos mais antigos
    const eventos = await prisma.domainEvent.findMany({
      where: { status: 'pendente' },
      orderBy: { criado_em: 'asc' },
      take: 50,
    });

    for (const evento of eventos) {
      try {
        // Roteamento de eventos para as filas correspondentes
        if (evento.tipo === DomainEvents.SINCRONIZAR_EMPRESA) {
          await ploomesQueue.add(evento.tipo, { ...evento.payload as any, event_id: evento.event_id }, { jobId: evento.event_id });
        } else {
          // Default para relatórios (PAGAMENTO_CONFIRMADO, REGERAR_PDF, etc)
          await relatoriosQueue.add(evento.tipo, { ...evento.payload as any, event_id: evento.event_id }, { jobId: evento.event_id });
        }

        // Marca como processado
        await prisma.domainEvent.update({
          where: { event_id: evento.event_id },
          data: {
            status: 'processado',
            processado_em: new Date(),
          },
        });

        console.log(`[Publicador] Evento ${evento.event_id} (${evento.tipo}) publicado com sucesso.`);
      } catch (err: any) {
        console.error(`[Publicador] Erro ao publicar evento ${evento.event_id}:`, err.message);
        
        // Atualiza tentativas e status de erro se necessário
        await prisma.domainEvent.update({
          where: { event_id: evento.event_id },
          data: {
            tentativas: { increment: 1 },
            erro: err.message,
            status: evento.tentativas >= 2 ? 'falha' : 'pendente', // falha após 3 tentativas
          },
        });
      }
    }
  } catch (err) {
    console.error('[Publicador] Erro na rotina de publicação:', err);
  } finally {
    isPublishing = false;
  }
}

let publicadorTimer: NodeJS.Timeout | null = null;

export function startPublicador(intervalMs = 5000) {
  console.log(`[Publicador] Iniciando polling de eventos a cada ${intervalMs}ms...`);
  publicadorTimer = setInterval(publicarEventosPendentes, intervalMs);
}

export async function stopPublicador() {
  if (publicadorTimer) {
    clearInterval(publicadorTimer);
    publicadorTimer = null;
  }
  await relatoriosQueue.close();
  await ploomesQueue.close();
  console.log('[Publicador] Parado.');
}
