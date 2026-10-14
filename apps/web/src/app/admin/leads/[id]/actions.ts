'use server';

import { prisma } from '@cet/db';
import { getRelatoriosQueue, getPloomesQueue } from '@/lib/queues';

export async function requestRegerarPdf(pedidoId: string) {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    throw new Error('Pedido não encontrado.');
  }

  await prisma.auditoria.create({
    data: {
      entidade: 'pedido',
      entidade_id: pedidoId,
      acao: 'REGERAR_PDF',
      depois: { pedido_id: pedidoId },
    },
  });

  const relatoriosQueue = getRelatoriosQueue();
  if (relatoriosQueue) {
    await relatoriosQueue.add('regerar_pdf', {
      pedido_id: pedidoId,
      event_id: `regerar-${Date.now()}`,
    });
  } else {
    console.log(`[RegerarPDF] Job agendado localmente para o pedido ${pedidoId} (Redis não configurado).`);
  }
}

export async function requestSincroniaPloomes(empresaId: string) {
  await prisma.auditoria.create({
    data: {
      entidade: 'empresa',
      entidade_id: empresaId,
      acao: 'FORCAR_SINCRONIA_PLOOMES',
      depois: { empresa_id: empresaId },
    },
  });

  const ploomesQueue = getPloomesQueue();
  if (ploomesQueue) {
    await ploomesQueue.add('sincronizar_empresa', {
      empresa_id: empresaId,
      event_id: `sync-${Date.now()}`,
    });
  } else {
    console.log(`[Ploomes] Sincronia simulada para empresa ${empresaId} (Redis não configurado).`);
  }
}
