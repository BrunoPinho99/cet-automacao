import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { asaasClient } from '@/lib/asaas';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const { ficha_id } = await request.json();

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

    // Se já tiver pedido para esse lead que esteja pago, não gera outro
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

    // Preço baseado na Rota
    // Exemplo: Rota C (100% digital) = R$ 149,90 (14990 centavos)
    let valorCobrar = 149.90; 
    let produtoNome = 'triagem';

    if (ficha.rota?.rota === 'A' || ficha.rota?.rota === 'B') {
      // Rota Estratégica / Crescimento pode ter valor diferente ou não ter pagamento imediato.
      // Assumindo tarifa base de R$ 249,90 para outras rotas.
      valorCobrar = 249.90;
      produtoNome = 'completo';
    }

    // Gera chave de idempotência baseada na ficha e no valor
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${ficha_id}-${valorCobrar}-${produtoNome}`)
      .digest('hex');

    // Se houver pedido com essa chave idempotency, apenas retorna a URL
    if (pedidoExistente && pedidoExistente.idempotency_key === idempotencyKey) {
      return NextResponse.json({
        pedido_id: pedidoExistente.id,
        checkout_url: pedidoExistente.checkout_url,
      });
    }

    // 1. Criar ou Obter Customer no Asaas
    const customerPayload = {
      name: ficha.lead.empresa?.razao_social || ficha.lead.contato.nome,
      cpfCnpj: ficha.lead.empresa?.cnpj || '00000000000', // CPF fake apenas para sandbox se CNPJ vazio
      email: ficha.lead.contato.email || 'contato@email.com',
      mobilePhone: ficha.lead.contato.telefone_e164,
      externalReference: ficha.lead.id,
    };

    const asaasCustomerId = await asaasClient.createCustomer(customerPayload);

    // 2. Criar Cobrança PIX no Asaas
    // Vencimento = Hoje + 1 dia
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateString = dueDate.toISOString().split('T')[0];

    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'PIX' as const,
      value: valorCobrar,
      dueDate: dueDateString,
      description: `Diagnóstico CET - ${produtoNome.toUpperCase()}`,
      externalReference: idempotencyKey, // Vincula a chave de idempotência no Asaas
    };

    const asaasPayment = await asaasClient.createPayment(paymentPayload);

    // 3. Salvar Pedido no Banco
    const pedidoCriado = await prisma.pedido.create({
      data: {
        lead_id: ficha.lead_id,
        produto: produtoNome,
        valor_centavos: Math.round(valorCobrar * 100), // Converte para centavos no banco
        asaas_customer_id: asaasCustomerId,
        asaas_payment_id: asaasPayment.id,
        checkout_url: asaasPayment.invoiceUrl,
        idempotency_key: idempotencyKey,
      }
    });

    return NextResponse.json({
      pedido_id: pedidoCriado.id,
      checkout_url: pedidoCriado.checkout_url,
      asaas_payment_id: asaasPayment.id,
    });

  } catch (error) {
    console.error('[Pagamento Error]:', error);
    return NextResponse.json({ erro: 'Erro interno ao processar pagamento' }, { status: 500 });
  }
}
