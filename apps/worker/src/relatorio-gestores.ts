import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';
import { enviarEmail } from '@cet/shared';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

export const relatoriosAgendadosQueue = new Queue('relatorios-agendados', { connection });

// Configura o job para rodar todos os dias às 8h
export async function setupRelatorioAgendado() {
  await relatoriosAgendadosQueue.add(
    'enviar-relatorio-diario',
    {},
    {
      repeat: {
        pattern: '0 8 * * *', // Todos os dias às 8h
      },
      jobId: 'relatorio-diario-grandes-empresas',
    }
  );
  console.log('[Worker] Relatório diário de grandes empresas agendado para 8h (cron: 0 8 * * *)');
}

export const relatoriosAgendadosWorker = new Worker(
  'relatorios-agendados',
  async (job) => {
    if (job.name === 'enviar-relatorio-diario') {
      console.log(`[Worker] Gerando relatório diário de grandes empresas...`);
      
      const dataLimite = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const empresas = await prisma.empresa.findMany({
        where: { criado_em: { gte: dataLimite } },
      });

      const grandesEmpresas = empresas.filter(e => 
        (e.trabalhadores_proprios + e.trabalhadores_terceiros) > 100
      );

      if (grandesEmpresas.length === 0) {
        console.log('[Worker] Nenhuma grande empresa cadastrada nas últimas 24h. Pulando e-mail.');
        return;
      }

      let html = `<h2>Relatório de Grandes Empresas - Últimas 24h</h2>`;
      html += `<p>Foram cadastradas ${grandesEmpresas.length} empresas com mais de 100 trabalhadores.</p>`;
      html += `<table border="1" cellpadding="5" style="border-collapse: collapse;">`;
      html += `<tr><th>CNPJ</th><th>Razão Social</th><th>Vidas</th></tr>`;
      
      for (const emp of grandesEmpresas) {
        const total = emp.trabalhadores_proprios + emp.trabalhadores_terceiros;
        html += `<tr><td>${emp.cnpj}</td><td>${emp.razao_social || 'N/A'}</td><td>${total}</td></tr>`;
      }
      
      html += `</table>`;

      const gestores = process.env.EMAIL_RELATORIO_DESTINO || 'diretoria@cet.com.br';
      
      await enviarEmail({
        para: gestores,
        assunto: `Relatório Diário CET - Grandes Empresas (${grandesEmpresas.length})`,
        html,
      });

      console.log('[Worker] Relatório de grandes empresas enviado com sucesso.');
    }
  },
  { connection }
);

relatoriosAgendadosWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.name} falhou:`, err);
});
