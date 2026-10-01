import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';
import { gerarPdfParaFicha } from './pdf-generator';
import { ploomesWorker } from './ploomes';
import { startPublicador, stopPublicador } from './publicador';
import { alertasWorker } from './alertas';
import { setupRelatorioAgendado, relatoriosAgendadosWorker } from './relatorio-gestores';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

console.log('🚀 Worker Iniciado. Conectando ao Redis em:', redisUrl);

// Inicia o publicador para ler DomainEvents do banco e publicar nas filas
startPublicador();

// Configura o job diário
setupRelatorioAgendado();

// Instancia um Worker (consumidor da fila 'relatorios-fila')
const pdfWorker = new Worker(
  'relatorios-fila',
  async (job) => {
    console.log(`[Worker] Novo job recebido: ${job.id}, Tipo: ${job.name}`);

    // Em vez de "pagamento.confirmado", agora escutamos "ficha.concluida" ou processamos de forma agnóstica
    if (job.name === 'ficha.concluida' || job.name === DomainEvents.PAGAMENTO_CONFIRMADO) {
      const { ficha_id, pedido_id, event_id } = job.data as { ficha_id?: string; pedido_id?: string; event_id?: string };

      if (!ficha_id && !pedido_id) {
        throw new Error('Faltam dados obrigatórios no payload do job (ficha_id ou pedido_id).');
      }

      console.log(`[Worker] Processando ${ficha_id ? `ficha ${ficha_id}` : `pedido ${pedido_id}`}${event_id ? `, event_id ${event_id}` : ''}`);
      
      if (ficha_id) {
        await gerarPdfParaFicha(ficha_id);
      } else if (pedido_id) {
        // Se ainda for suportado:
        // await gerarPdfParaPedido(pedido_id);
        console.warn(`[Worker] Job tem pedido_id mas a lógica atual exige ficha_id. Ignorando.`);
      }
    }
  },
  { connection }
);

pdfWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} concluído com sucesso`);
});

pdfWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} falhou com erro:`, err.message);
});

// ============================================================================
// DUMMY SERVER (TRUQUE DO RENDER)
// ============================================================================
// Como o Render não tem mais "Background Worker" de graça, subimos um servidor
// HTTP bobo apenas para ele achar que é um Web Service comum e nos dar o Free Tier.
import http from 'http';

const port = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Worker rodando e ouvindo as filas (Modo Gratuito)!');
});
server.listen(port, () => {
  console.log(`🌍 Dummy server escutando na porta ${port} para manter o Render feliz.`);
});

// Limpeza no desligamento (SIGTERM / SIGINT)
const gracefulShutdown = async () => {
  console.log('Encerrando workers de forma graciosa...');
  await stopPublicador();
  await pdfWorker.close();
  await ploomesWorker.close();
  await alertasWorker.close();
  await relatoriosAgendadosWorker.close();
  server.close();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
