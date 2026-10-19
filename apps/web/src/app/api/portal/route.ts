import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { asaasClient, getAsaasConfig } from '@/lib/asaas';
import { DomainEvents } from '@cet/shared';
import { obterOuGerarRelatorio } from '@/lib/relatorio-generator';

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
            contato: true,
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

    // TRAVA E VERIFICAÇÃO DE PAGAMENTO:
    let ultimoPedido = ficha.lead?.pedidos?.[0];
    let statusPagamento = ultimoPedido?.status?.toLowerCase() || 'pendente';
    let isPago = statusPagamento === 'pago' || statusPagamento === 'confirmado' || statusPagamento === 'isento';

    // Se estiver pendente, consulta o Asaas em tempo real para não depender de webhook
    if (!isPago && ultimoPedido?.asaas_payment_id && !ultimoPedido.asaas_payment_id.startsWith('simulado_')) {
      const { apiKey } = getAsaasConfig();
      if (apiKey && apiKey !== 'OBTER_NO_PAINEL_ASAAS') {
        try {
          const asaasData = await asaasClient.getPayment(ultimoPedido.asaas_payment_id);
          if (asaasData.status === 'RECEIVED' || asaasData.status === 'CONFIRMED') {
            await prisma.pedido.update({
              where: { id: ultimoPedido.id },
              data: {
                status: 'pago',
                pago_em: new Date(),
              },
            });

            await prisma.domainEvent.create({
              data: {
                tipo: DomainEvents.PAGAMENTO_CONFIRMADO,
                payload: {
                  pedido_id: ultimoPedido.id,
                  lead_id: ultimoPedido.lead_id,
                  valor_centavos: ultimoPedido.valor_centavos,
                  payment_id: ultimoPedido.asaas_payment_id,
                },
              },
            }).catch(() => {});

            isPago = true;
            statusPagamento = 'pago';
          }
        } catch (err) {
          console.warn('[Portal Asaas Check] Erro ao consultar Asaas:', err);
        }
      }
    }

    const respostasJson: any = ficha.respostas || {};
    const bloco1 = respostasJson.bloco_1 || {};
    const fallbackRaw = bloco1.razao_social || bloco1.nome_fantasia || ficha.lead?.contato?.nome || 'Sua Empresa';
    const razaoSocialFallback = fallbackRaw === 'Desconhecida' ? 'Sua Empresa' : fallbackRaw;
    const cnpjFallback = bloco1.cnpj || '';

    const empresa = ficha.lead?.empresa;
    const empresaNomeRaw = empresa?.razao_social || empresa?.nome_fantasia;
    const razaoSocialFinal = (empresaNomeRaw && empresaNomeRaw !== 'Desconhecida') ? empresaNomeRaw : razaoSocialFallback;
    const cnpjFinal = empresa?.cnpj || cnpjFallback;

    const scoreSstFinal = ficha.score_sst || {
      total: 28,
      classificacao: 'alto_risco',
    };

    const rotaFinal = ficha.rota || {
      rota: 'C',
    };

    // Se estiver pago mas ainda não tiver o registro de relatório criado, gera imediatamente
    let relatorioFinal = ficha.relatorio;
    if (isPago && !relatorioFinal) {
      try {
        await obterOuGerarRelatorio(ficha.id);
        relatorioFinal = await prisma.relatorio.findUnique({
          where: { ficha_id: ficha.id },
        });
      } catch (errRelatorio) {
        console.warn('[Portal] Aviso ao gerar relatório para ficha paga:', errRelatorio);
      }
    }

    return NextResponse.json({
      ficha_id: ficha.id,
      token: ficha.token_retomada,
      pago: isPago,
      status_pagamento: statusPagamento,
      empresa: {
        razao_social: razaoSocialFinal,
        cnpj: cnpjFinal,
      },
      score_sst: scoreSstFinal,
      score_comercial: ficha.score_comercial,
      rota: rotaFinal,
      // Se estiver pago, retorna os dados para download imediato
      relatorio: isPago ? {
        id: relatorioFinal?.id || ficha.id,
        gerado_em: relatorioFinal?.gerado_em || new Date(),
      } : null,
      checkout_url: `/ficha/${token}/pagamento`,
    });

  } catch (error) {
    console.error('[GET /api/portal]', error);
    return NextResponse.json({ error: 'Erro interno ao carregar dados do portal' }, { status: 500 });
  }
}
