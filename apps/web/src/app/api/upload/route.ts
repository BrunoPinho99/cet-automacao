import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { uploadFileToStorage } from '@cet/shared';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { env } from 'node:process';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_MAX_SIZE_MB = parseInt(env.UPLOAD_MAX_SIZE_MB || '20', 10);
const MAX_SIZE_BYTES = UPLOAD_MAX_SIZE_MB * 1024 * 1024;

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

    // Validação de Magic Bytes
    let isContentValid = false;
    if (buffer.length > 4) {
      const hex = buffer.subarray(0, 4).toString('hex').toUpperCase();
      if (file.type === 'application/pdf' && hex.startsWith('25504446')) {
        isContentValid = true;
      } else if (file.type === 'image/jpeg' && hex.startsWith('FFD8FF')) {
        isContentValid = true;
      } else if (file.type === 'image/png' && hex === '89504E47') {
        isContentValid = true;
      } else if (file.type === 'image/webp' && hex === '52494646') {
        const webpHex = buffer.subarray(8, 12).toString('hex').toUpperCase();
        if (webpHex === '57454250') {
          isContentValid = true;
        }
      }
    }

    if (!isContentValid) {
      return NextResponse.json({ erro: 'Conteúdo do arquivo não corresponde ao tipo declared. Arquivo recusado por segurança.' }, { status: 400 });
    }

    // Calcula checksum (SHA-256)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Cria nome único
    const extension = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.png');
    const storageKey = `${crypto.randomUUID()}${extension}`;

    // Salva no storage (Supabase ou Local)
    const uploadResult = await uploadFileToStorage({
      bucket: 'cet-uploads',
      key: storageKey,
      buffer,
      contentType: file.type,
    });

    // Grava metadados no banco
    const arquivo = await prisma.arquivo.create({
      data: {
        nome: file.name,
        mime: file.type,
        tamanho: file.size,
        storage_key: uploadResult.key,
        checksum: hash,
        status_antivirus: 'nao_verificado',
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
