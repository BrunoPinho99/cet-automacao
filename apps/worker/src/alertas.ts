import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';
import { enviarEmail } from '@cet/shared/src/email'; // Assume barrel ou path direto

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

export const alertasWorker = new Worker(
  'alertas-fila',
  async (job) => {
    console.log(`[AlertasWorker] Novo job recebido: ${job.id}, Tipo: ${job.name}`);

    if (job.name === DomainEvents.ROTA_DEFINIDA || job.name === DomainEvents.ALERTA_ROTA_A) {
      const { ficha_id, rota, empresa_id, razao_social, cnpj, trabalhadores, event_id } = job.data;

      // Dispara alerta imediato se a rota for 'A'
      if (rota === 'A') {
        console.log(`[AlertasWorker] Disparando alerta de Rota A para a empresa ${razao_social || empresa_id}`);
        
        // Exemplo: Criar ou atualizar Negócio para atribuir "vendedor sênior"
        // Como não temos a entidade VendedorSenior mapeada de forma estática, atribuímos ao campo genérico ou registramos a ação
        
        // Envia notificação por e-mail para gestores
        const gestores = process.env.EMAIL_RELATORIO_DESTINO || 'diretoria@cet.com.br';
        await enviarEmail({
          para: gestores,
          assunto: `[ALERTA] Rota A Definida - ${razao_social || cnpj}`,
          texto: `A empresa ${razao_social || 'N/A'} (CNPJ: ${cnpj}) foi classificada como Rota A.\nTrabalhadores: ${trabalhadores}\n\nAcesse o painel para prosseguir com o atendimento especializado.`,
          html: `<p>A empresa <strong>${razao_social || 'N/A'}</strong> (CNPJ: ${cnpj}) foi classificada como <strong>Rota A</strong>.</p><p>Trabalhadores: ${trabalhadores}</p><p>Acesse o painel para prosseguir com o atendimento especializado.</p>`,
        });

        // Registrar na auditoria que o alerta foi processado
        await prisma.auditoria.create({
          data: {
            entidade: 'Rota',
            entidade_id: ficha_id,
            acao: 'ALERTA_ROTA_A_DISPARADO',
            depois: { notificado: gestores },
          }
        });
      }
    }
  },
  { connection }
);

alertasWorker.on('completed', (job) => {
  console.log(`[AlertasWorker] Job ${job.id} concluído`);
});

alertasWorker.on('failed', (job, err) => {
  console.error(`[AlertasWorker] Job ${job?.id} falhou:`, err.message);
});
