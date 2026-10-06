import { NextResponse } from 'next/server';
import { obterOuGerarRelatorio } from '@/lib/relatorio-generator';

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
