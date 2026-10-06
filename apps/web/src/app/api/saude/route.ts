import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { getRelatoriosQueue, getPloomesQueue } from '@/lib/queues';

export async function GET(request: Request) {
  // Autenticação simples baseada no Header ou sessão gestor
  const role = request.headers.get('role');
  const authHeader = request.headers.get('authorization');
  
  if (role !== 'gestor' && authHeader !== 'Bearer cet-saude-secret') {
    return NextResponse.json({ error: 'Acesso Negado. Requer nível Gestor.' }, { status: 403 });
  }

  try {
    const relatoriosQueue = getRelatoriosQueue();
    const ploomesQueue = getPloomesQueue();

    let relatoriosCounts: Record<string, number> | string = 'desconectado';
    let ploomesCounts: Record<string, number> | string = 'desconectado';

    if (relatoriosQueue) {
      try {
        relatoriosCounts = await relatoriosQueue.getJobCounts();
      } catch {
        relatoriosCounts = 'erro_conexao_redis';
      }
    }

    if (ploomesQueue) {
      try {
        ploomesCounts = await ploomesQueue.getJobCounts();
      } catch {
        ploomesCounts = 'erro_conexao_redis';
      }
    }

    const deadEvents = await prisma.domainEvent.count({
      where: { status: 'falha' }
    });

    const pendingEvents = await prisma.domainEvent.count({
      where: { status: 'pendente' }
    });

    const dbConnected = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    
    // SLA Médio de Processamento
    const eventosProcessados = await prisma.domainEvent.findMany({
      where: { status: 'processado', processado_em: { not: null } },
      select: { criado_em: true, processado_em: true },
      take: 100,
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
      status: 'ok',
      banco_dados: dbConnected ? 'conectado' : 'desconectado',
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
    const message = error instanceof Error ? error.message : 'Erro no healthcheck';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
