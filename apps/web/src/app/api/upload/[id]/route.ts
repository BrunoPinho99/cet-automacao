import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { downloadFileFromStorage } from '@cet/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return new NextResponse('ID do arquivo não informado', { status: 400 });
    }

    const arquivo = await prisma.arquivo.findUnique({
      where: { id }
    });

    if (!arquivo) {
      return new NextResponse('Arquivo não encontrado', { status: 404 });
    }

    let fileBuffer: Buffer;
    try {
      const result = await downloadFileFromStorage('cet-uploads', arquivo.storage_key);
      fileBuffer = result.buffer;
    } catch {
      return new NextResponse('Arquivo não encontrado no storage', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', arquivo.mime);
    headers.set('Content-Disposition', `attachment; filename="${arquivo.nome}"`);
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });


  } catch (error) {
    console.error('[GET /api/upload/[id]]', error);
    return new NextResponse('Erro interno ao baixar arquivo.', { status: 500 });
  }
}
