import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const relatorio = await prisma.relatorio.findUnique({
      where: { id },
    });

    if (!relatorio) {
      return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 });
    }

    const filepath = path.join(process.cwd(), '../../.pdfs', relatorio.arquivo_pdf_key);
    
    try {
      const fileBuffer = await fs.readFile(filepath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="diagnostico_sst.pdf"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (err) {
      console.error(`Erro ao ler arquivo PDF ${filepath}:`, err);
      return NextResponse.json({ error: 'Arquivo físico não encontrado ou não gerado' }, { status: 404 });
    }
  } catch (error) {
    console.error('[GET /api/relatorios/[id]]', error);
    return NextResponse.json({ error: 'Erro interno ao baixar relatório' }, { status: 500 });
  }
}
