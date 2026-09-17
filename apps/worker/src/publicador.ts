import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const relatoriosQueue = new Queue('relatorios-fila', { connection });
const ploomesQueue = new Queue('ploomes-fila', { connection });
const alertasQueue = new Queue('alertas-fila', { connection });

// Dicionário de filas por tipo de evento
const FILAS: Record<string, Queue> = {
  [DomainEvents.SINCRONIZAR_EMPRESA]: ploomesQueue,
  [DomainEvents.PAGAMENTO_CONFIRMADO]: relatoriosQueue,
  [DomainEvents.REGERAR_PDF]: relatoriosQueue,
  [DomainEvents.FICHA_CONCLUIDA]: relatoriosQueue,
  [DomainEvents.ROTA_DEFINIDA]: alertasQueue,
  [DomainEvents.ALERTA_ROTA_A]: alertasQueue,
};

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
        const queue = FILAS[evento.tipo];

        if (!queue) {
          console.warn(`[Publicador] Nenhuma fila mapeada para o evento ${evento.tipo}. Marcando como ignorado.`);
          await prisma.domainEvent.update({
            where: { event_id: evento.event_id },
            data: { status: 'ignorado', processado_em: new Date() },
          });
          continue;
        }

        // Enfileira na fila correta
        await queue.add(evento.tipo, { ...evento.payload as any, event_id: evento.event_id }, { jobId: evento.event_id });

        // Marca como enfileirado
        await prisma.domainEvent.update({
          where: { event_id: evento.event_id },
          data: {
            status: 'enfileirado',
            processado_em: new Date(),
          },
        });

        console.log(`[Publicador] Evento ${evento.event_id} (${evento.tipo}) publicado com sucesso na fila ${queue.name}.`);
      } catch (err: any) {
        console.error(`[Publicador] Erro ao publicar evento ${evento.event_id}:`, err.message);
        
        // Atualiza tentativas e marca morto se >= 5
        const novasTentativas = evento.tentativas + 1;
        await prisma.domainEvent.update({
          where: { event_id: evento.event_id },
          data: {
            tentativas: novasTentativas,
            erro: err.message,
            status: novasTentativas >= 5 ? 'morto' : 'pendente',
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
