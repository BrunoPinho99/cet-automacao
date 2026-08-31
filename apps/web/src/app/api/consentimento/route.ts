import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TEXTO_CONSENTIMENTO_V1, VERSAO_CONSENTIMENTO_ATUAL, getHashConsentimento } from '@cet/shared';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contato_id } = body;

    if (!contato_id) {
      return NextResponse.json(
        { erro: 'Campo obrigatório: contato_id' },
        { status: 400 },
      );
    }

    const jaTemConsentimento = await prisma.consentimento.findFirst({
      where: { contato_id }
    });

    if (jaTemConsentimento) {
      return NextResponse.json({ sucesso: true, mensagem: 'Consentimento já existente.' }, { status: 200 });
    }

    await prisma.consentimento.create({
      data: {
        contato_id,
        versao_texto: VERSAO_CONSENTIMENTO_ATUAL,
        texto_hash: getHashConsentimento(),
        finalidade: 'diagnostico_sst_web',
      }
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Consentimento registrado.' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/consentimento]', error);
    return NextResponse.json(
      { erro: 'Erro interno ao registrar consentimento.' },
      { status: 500 },
    );
  }
}
