import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { prisma } from '@cet/db';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const relatoriosQueue = new Queue('relatorios-fila', { connection: { url: redisUrl } });
const ploomesQueue = new Queue('ploomes-fila', { connection: { url: redisUrl } });

export async function GET(request: Request) {
  // Autenticação simples baseada no Header (RBAC Simulado)
  const role = request.headers.get('role');
  if (role !== 'gestor') {
    return NextResponse.json({ error: 'Acesso Negado. Requer nível Gestor.' }, { status: 403 });
  }

  try {
    const relatoriosCounts = await relatoriosQueue.getJobCounts();
    const ploomesCounts = await ploomesQueue.getJobCounts();

    const deadEvents = await prisma.domainEvent.count({
      where: { status: 'falha' }
    });

    const pendingEvents = await prisma.domainEvent.count({
      where: { status: 'pendente' }
    });
    
    // SLA Médio de Processamento (Relatórios)
    // Considerando que temos processado_em e criado_em, podemos tirar a média
    const eventosProcessados = await prisma.domainEvent.findMany({
      where: { status: 'processado', processado_em: { not: null } },
      select: { criado_em: true, processado_em: true },
      take: 100, // Últimos 100
      orderBy: { criado_em: 'desc' }
    });

    let mediaMs = 0;
    if (eventosProcessados.length > 0) {
      const soma = eventosProcessados.reduce((acc, ev) => {
        return acc + (ev.processado_em!.getTime() - ev.criado_em.getTime());
      }, 0);
      mediaMs = soma / eventosProcessados.length;
    }

    return NextResponse.json({
      filas: {
        relatorios: relatoriosCounts,
        ploomes: ploomesCounts,
      },
      outbox: {
        dead_events: deadEvents,
        pending_events: pendingEvents
      },
      sla: {
        tempo_medio_processamento_ms: Math.round(mediaMs)
      }
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
