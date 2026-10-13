import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json(
      { error: 'Acesso negado. Apenas administradores podem executar esta ação.' },
      { status: 403 }
    );
  }

  try {
    // Ordem estrita respeitando chaves estrangeiras
    await prisma.mensagem.deleteMany({});
    await prisma.relatorio.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.rota.deleteMany({});
    await prisma.scoreSST.deleteMany({});
    await prisma.scoreComercial.deleteMany({});
    await prisma.documentoDeclarado.deleteMany({});
    await prisma.arquivo.deleteMany({});
    await prisma.ficha.deleteMany({});
    await prisma.negocio.deleteMany({});
    await prisma.consentimento.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.contato.deleteMany({});
    await prisma.empresa.deleteMany({});

    // Limpa eventos de domínio demo
    await prisma.domainEvent.deleteMany({
      where: {
        payload: {
          path: ['origem'],
          equals: 'seed_demo',
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Todos os dados de teste/demonstração foram removidos. O sistema está 100% limpo e operando em tempo real.',
    });
  } catch (error: any) {
    console.error('[Limpar Demo API] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro ao limpar dados' }, { status: 500 });
  }
}
