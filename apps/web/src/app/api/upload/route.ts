import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { env } from 'node:process';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_MAX_SIZE_MB = parseInt(env.UPLOAD_MAX_SIZE_MB || '20', 10);
const MAX_SIZE_BYTES = UPLOAD_MAX_SIZE_MB * 1024 * 1024;
const UPLOAD_DIR = env.STORAGE_LOCAL_PATH || './uploads';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ erro: 'Tipo de arquivo não permitido. Apenas PDF e imagens.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ erro: `O arquivo ultrapassa o limite de ${UPLOAD_MAX_SIZE_MB}MB.` }, { status: 400 });
    }

    // Lê o conteúdo do arquivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calcula checksum (SHA-256)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Cria nome único no storage local
    const extension = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.png');
    const storageKey = `${crypto.randomUUID()}${extension}`;
    const filePath = path.join(process.cwd(), UPLOAD_DIR, storageKey);

    // Garante que o diretório de uploads existe
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Salva o arquivo no disco
    await fs.writeFile(filePath, buffer);

    // Grava metadados no banco
    const arquivo = await prisma.arquivo.create({
      data: {
        nome: file.name,
        mime: file.type,
        tamanho: file.size,
        storage_key: storageKey,
        checksum: hash,
        status_antivirus: 'pendente',
      }
    });

    return NextResponse.json({ 
      id: arquivo.id,
      nome: arquivo.nome,
      url: `/api/upload/${arquivo.id}` // futura rota para download/visualização
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/upload]', error);
    return NextResponse.json({ erro: 'Erro interno ao processar upload.' }, { status: 500 });
  }
}
