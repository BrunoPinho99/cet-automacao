import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cet/db';

export async function GET(request: NextRequest) {
  try {
    const mortos = await prisma.domainEvent.findMany({
      where: { status: 'morto' },
      orderBy: { criado_em: 'desc' },
      take: 50,
    });
    return NextResponse.json(mortos);
  } catch (error) {
    console.error('[GET /api/admin/eventos/mortos]', error);
    return NextResponse.json({ erro: 'Erro ao buscar eventos mortos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { event_id } = await request.json();
    
    if (!event_id) {
      return NextResponse.json({ erro: 'event_id é obrigatório' }, { status: 400 });
    }

    const evento = await prisma.domainEvent.findUnique({
      where: { event_id }
    });

    if (!evento || evento.status !== 'morto') {
      return NextResponse.json({ erro: 'Evento não encontrado ou não está morto' }, { status: 400 });
    }

    // Reenfileira o evento
    await prisma.domainEvent.update({
      where: { event_id },
      data: {
        status: 'pendente',
        tentativas: 0,
        erro: null,
      }
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Evento retornado para a fila.' });
  } catch (error) {
    console.error('[POST /api/admin/eventos/mortos]', error);
    return NextResponse.json({ erro: 'Erro ao reprocessar evento.' }, { status: 500 });
  }
}
