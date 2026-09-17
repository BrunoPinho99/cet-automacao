import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { env } from 'node:process';

const UPLOAD_DIR = env.STORAGE_LOCAL_PATH || './uploads';

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

    const filePath = path.join(process.cwd(), UPLOAD_DIR, arquivo.storage_key);

    try {
      await fs.access(filePath);
    } catch {
      return new NextResponse('Arquivo não encontrado no disco', { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);

    const headers = new Headers();
    headers.set('Content-Type', arquivo.mime);
    // Força o download e proteção X-Content-Type-Options
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
