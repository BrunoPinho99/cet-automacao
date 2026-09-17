import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { podeLiberarProducao, EstadoFicha, EstadoPagamento, EstadoDocumentos } from '@cet/core';
import { getSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['admin', 'tecnico', 'medico', 'comercial'].includes(session.role)) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
    }

    const { id: fichaId } = await params;

    const ficha = await prisma.ficha.findUnique({
      where: { id: fichaId },
      include: {
        lead: {
          include: { pedidos: { take: 1, orderBy: { criado_em: 'desc' } } }
        },
        documentosDeclarados: true,
      }
    });

    if (!ficha) {
      return NextResponse.json({ erro: 'Ficha não encontrada' }, { status: 404 });
    }

    const estadoFicha: EstadoFicha = { status: ficha.status as any };
    
    // Simplificando pagamento: se tem pedido aprovado ou não tem pedido (isento)
    const ultimoPedido = ficha.lead.pedidos[0];
    const estadoPagamento: EstadoPagamento = { 
      status: ultimoPedido ? (ultimoPedido.status as any) : 'isento' 
    };

    // Todos concluídos se não tem nenhum pendente de upload (simulação básica)
    const estadoDocumentos: EstadoDocumentos = {
      todos_concluidos: true, // Aqui você poderia mapear a lógica real
      faltam_assinaturas: false,
    };

    const validacao = podeLiberarProducao(estadoFicha, estadoPagamento, estadoDocumentos);

    if (!validacao.permitido) {
      return NextResponse.json({ 
        erro: 'Não é possível liberar para produção', 
        motivos: validacao.motivos 
      }, { status: 422 });
    }

    // Se liberado, poderia alterar o status da ficha ou despachar o DomainEvent
    await prisma.ficha.update({
      where: { id: fichaId },
      data: { status: 'concluida' } // Ou outro status de "liberada"
    });

    await prisma.auditoria.create({
      data: {
        entidade: 'Ficha',
        entidade_id: fichaId,
        acao: 'LIBERADA_PARA_PRODUCAO',
        usuario_id: session.userId,
      }
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Liberado para produção com sucesso' });
  } catch (error) {
    console.error('[POST /api/admin/fichas/[id]/liberar]', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
