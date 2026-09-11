'use server';

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const relatoriosQueue = new Queue('relatorios-fila', { connection });

export async function requestRegerarPdf(pedidoId: string) {
  // 1. Validate that the pedido exists
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    throw new Error('Pedido não encontrado.');
  }

  // 2. Gravar em Auditoria (conforme instrução 6A/6B)
  // Assumindo que você tem um usuário autenticado, mas aqui colocaremos algo fixo ou lido da sessão
  // O schema tem Auditoria com ação, detalhes, usuario_id, etc.
  await prisma.auditoria.create({
    data: {
      acao: 'REGERAR_PDF',
      detalhes: JSON.stringify({ pedido_id: pedidoId }),
    }
  });

  // 3. Adicionar job na fila do Worker
  await relatoriosQueue.add('regerar_pdf', {
    pedido_id: pedidoId,
    event_id: `regerar-${Date.now()}`
  });
}

export async function requestSincroniaPloomes(empresaId: string) {
  // 1. Gravar em Auditoria
  await prisma.auditoria.create({
    data: {
      acao: 'FORCAR_SINCRONIA_PLOOMES',
      detalhes: JSON.stringify({ empresa_id: empresaId }),
    }
  });

  // 2. Adicionar job na fila
  // Assuming a ploomes queue, or the same queue for now. Let's use a "ploomes-fila" queue.
  const ploomesQueue = new Queue('ploomes-fila', { connection });
  await ploomesQueue.add('sincronizar_empresa', {
    empresa_id: empresaId,
    event_id: `sync-${Date.now()}`
  });
}
