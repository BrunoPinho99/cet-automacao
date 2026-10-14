import { NextResponse } from 'next/server';
import { obterOuGerarRelatorio } from '@/lib/relatorio-generator';
import { prisma } from '@cet/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get('format');

    if (!id) {
      return NextResponse.json({ error: 'ID do relatório ou ficha não informado' }, { status: 400 });
    }

    // TRAVA DE SEGURANÇA:
    // Apenas equipe interna logada da CET ou clientes com pagamento confirmado podem baixar
    const session = await getSession();
    const isEquipeInterna = session && ['admin', 'tecnico', 'medico', 'comercial'].includes(session.role);

    if (!isEquipeInterna) {
      const relatorioDb = await prisma.relatorio.findFirst({
        where: { OR: [{ id }, { ficha_id: id }] },
        include: {
          ficha: {
            include: {
              lead: {
                include: { pedidos: { orderBy: { criado_em: 'desc' }, take: 1 } },
              },
            },
          },
        },
      });

      if (relatorioDb) {
        const ultimoPedido = relatorioDb.ficha?.lead?.pedidos?.[0];
        const statusPagamento = ultimoPedido?.status?.toLowerCase() || 'pendente';
        const isPago = statusPagamento === 'pago' || statusPagamento === 'confirmado' || statusPagamento === 'isento';

        if (!isPago) {
          return NextResponse.json(
            { error: 'Relatório bloqueado. O download só é liberado após a confirmação do pagamento.' },
            { status: 402 }
          );
        }
      }
    }

    const { buffer, mime, key } = await obterOuGerarRelatorio(id);

    // Se for visualização HTML direta no navegador
    if (format === 'html' || mime === 'text/html') {
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // Se for download de PDF
    const filename = key.endsWith('.pdf') ? key : `diagnostico_sst_${id}.html`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/relatorios/[id]]', error);
    const msg = error instanceof Error ? error.message : 'Erro interno ao obter relatório';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
