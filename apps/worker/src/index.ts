import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';
import { gerarPdfParaPedido } from './pdf-generator';
import { ploomesWorker } from './ploomes';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

console.log('🚀 Worker Iniciado. Conectando ao Redis em:', redisUrl);

const worker = new Worker(
  'relatorios-fila',
  async (job) => {
    console.log(`[Worker] Recebido job ${job.id} de tipo ${job.name}`);
    
    // Processamento do evento pagamento.confirmado ou regerar_pdf
    if (job.name === DomainEvents.PAGAMENTO_CONFIRMADO || job.name === DomainEvents.REGERAR_PDF) {
      const { pedido_id, event_id } = job.data;
      
      if (!pedido_id) {
        throw new Error('Faltam dados obrigatórios no payload do job.');
      }

      console.log(`[Worker] Processando pedido ${pedido_id}${event_id ? `, event_id ${event_id}` : ''}`);
      
      await gerarPdfParaPedido(pedido_id);
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} concluído com sucesso`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} falhou com erro:`, err.message);
});

// Limpeza no desligamento (SIGTERM / SIGINT)
const gracefulShutdown = async () => {
  console.log('Encerrando workers de forma graciosa...');
  await worker.close();
  await ploomesWorker.close();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
