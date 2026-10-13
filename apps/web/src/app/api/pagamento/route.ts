import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { asaasClient } from '@/lib/asaas';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const { ficha_id, plano = 'essencial' } = await request.json();

    if (!ficha_id) {
      return NextResponse.json({ erro: 'ficha_id não informado' }, { status: 400 });
    }

    // Buscar a ficha, o lead e a rota
    const ficha = await prisma.ficha.findUnique({
      where: { id: ficha_id },
      include: {
        lead: {
          include: {
            empresa: true,
            contato: true,
          }
        },
        rota: true,
      }
    });

    if (!ficha || !ficha.lead) {
      return NextResponse.json({ erro: 'Ficha ou Lead não encontrado' }, { status: 404 });
    }

    // Se já tiver pedido pago para esse lead, não gera outro
    const pedidoExistente = await prisma.pedido.findFirst({
      where: { lead_id: ficha.lead_id },
      orderBy: { criado_em: 'desc' }
    });

    if (pedidoExistente && pedidoExistente.status === 'pago') {
      return NextResponse.json({
        mensagem: 'Pagamento já foi realizado para este lead',
        pedido_id: pedidoExistente.id,
      });
    }

    // Valores oficiais das Rotas B e C:
    // Essencial: R$ 19,90 | Completo: R$ 29,90
    const isCompleto = plano === 'completo';
    const valorCobrar = isCompleto ? 29.90 : 19.90;
    const produtoNome = isCompleto ? 'diagnostico_completo' : 'diagnostico_essencial';

    // Chave de idempotência baseada na ficha, produto e valor
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${ficha_id}-${valorCobrar}-${produtoNome}`)
      .digest('hex');

    if (pedidoExistente && pedidoExistente.idempotency_key === idempotencyKey && pedidoExistente.checkout_url) {
      return NextResponse.json({
        pedido_id: pedidoExistente.id,
        checkout_url: pedidoExistente.checkout_url,
      });
    }

    let asaasCustomerId = 'simulado_cust_' + ficha.lead.id;
    let asaasPaymentId = 'simulado_pay_' + Date.now();
    let checkoutUrl = `https://cet-automacao.vercel.app/portal/${ficha.token_retomada}?pagamento_pendente=true`;

    const asaasKey = process.env.ASAAS_API_KEY || '';
    const hasRealAsaasKey = asaasKey && asaasKey !== 'OBTER_NO_PAINEL_ASAAS';

    if (hasRealAsaasKey) {
      try {
        // 1. Criar ou Obter Customer no Asaas
        const customerPayload = {
          name: ficha.lead.empresa?.razao_social || ficha.lead.contato.nome,
          cpfCnpj: ficha.lead.empresa?.cnpj || '00000000000',
          email: ficha.lead.contato.email || 'contato@email.com',
          mobilePhone: ficha.lead.contato.telefone_e164,
          externalReference: ficha.lead.id,
        };

        asaasCustomerId = await asaasClient.createCustomer(customerPayload);

        // 2. Criar Cobrança no Asaas (PIX / Cartão)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const dueDateString = dueDate.toISOString().split('T')[0];

        const paymentPayload = {
          customer: asaasCustomerId,
          billingType: 'PIX' as const,
          value: valorCobrar,
          dueDate: dueDateString,
          description: `Diagnóstico CET - ${isCompleto ? 'Completo (R$ 29,90)' : 'Essencial (R$ 19,90)'}`,
          externalReference: idempotencyKey,
        };

        const asaasPayment = await asaasClient.createPayment(paymentPayload);
        asaasPaymentId = asaasPayment.id;
        checkoutUrl = asaasPayment.invoiceUrl;
      } catch (asaasErr: any) {
        console.error('[Asaas API] Falha na integração externa:', asaasErr.message);
        // Se a chave não for válida ou estiver indisponível, cai para o portal local
      }
    }

    // 3. Salvar ou Atualizar Pedido no Banco
    const pedidoCriado = await prisma.pedido.create({
      data: {
        lead_id: ficha.lead_id,
        produto: produtoNome,
        valor_centavos: Math.round(valorCobrar * 100),
        asaas_customer_id: asaasCustomerId,
        asaas_payment_id: asaasPaymentId,
        checkout_url: checkoutUrl,
        idempotency_key: idempotencyKey,
      }
    });

    return NextResponse.json({
      pedido_id: pedidoCriado.id,
      checkout_url: pedidoCriado.checkout_url,
      asaas_payment_id: asaasPaymentId,
      valor: valorCobrar,
      plano: produtoNome,
    });

  } catch (error) {
    console.error('[Pagamento Error]:', error);
    return NextResponse.json({ erro: 'Erro interno ao processar pagamento' }, { status: 500 });
  }
}
