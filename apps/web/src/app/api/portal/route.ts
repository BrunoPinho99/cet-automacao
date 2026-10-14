import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }

    const ficha = await prisma.ficha.findUnique({
      where: { token_retomada: token },
      include: {
        lead: {
          include: {
            empresa: true,
            pedidos: {
              orderBy: { criado_em: 'desc' },
              take: 1,
            },
          },
        },
        score_sst: true,
        score_comercial: true,
        rota: true,
        relatorio: true,
      },
    });

    if (!ficha) {
      return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 });
    }

    if (ficha.status !== 'concluida') {
      return NextResponse.json({ 
        status: ficha.status,
        mensagem: 'O diagnóstico ainda não foi concluído.' 
      }, { status: 403 });
    }

    // TRAVA DE PAGAMENTO:
    // O diagnóstico e o PDF só são liberados se houver pedido pago ou isento
    const ultimoPedido = ficha.lead?.pedidos?.[0];
    const statusPagamento = ultimoPedido?.status?.toLowerCase() || 'pendente';
    const isPago = statusPagamento === 'pago' || statusPagamento === 'confirmado' || statusPagamento === 'isento';

    const empresa = ficha.lead.empresa;

    return NextResponse.json({
      pago: isPago,
      status_pagamento: statusPagamento,
      empresa: {
        razao_social: empresa?.razao_social || empresa?.nome_fantasia || 'Desconhecida',
        cnpj: empresa?.cnpj,
      },
      score_sst: ficha.score_sst,
      score_comercial: ficha.score_comercial,
      rota: ficha.rota,
      // Se não estiver pago, NÃO retorna dados do relatório
      relatorio: isPago && ficha.relatorio ? {
        id: ficha.relatorio.id,
        gerado_em: ficha.relatorio.gerado_em,
      } : null,
      checkout_url: ultimoPedido?.checkout_url || `/ficha/${token}/pagamento`,
    });

  } catch (error) {
    console.error('[GET /api/portal]', error);
    return NextResponse.json({ error: 'Erro interno ao carregar dados do portal' }, { status: 500 });
  }
}
