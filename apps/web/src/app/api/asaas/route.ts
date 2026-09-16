import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';
import { env } from 'node:process';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  const ASAAS_WEBHOOK_SECRET = env.ASAAS_WEBHOOK_SECRET || '';
  try {
    const rawBody = await request.text();
    const token = request.headers.get('asaas-access-token');

    // Validação de Segurança do Asaas
    if (!token || !ASAAS_WEBHOOK_SECRET) {
      return NextResponse.json({ erro: 'Unauthorized' }, { status: 401 });
    }

    // Compara tokens com timing safe para evitar timing attacks
    const bufferToken = Buffer.from(token);
    const bufferSecret = Buffer.from(ASAAS_WEBHOOK_SECRET);

    const isTokenValid = 
      bufferToken.length === bufferSecret.length &&
      crypto.timingSafeEqual(bufferToken, bufferSecret);

    if (!isTokenValid) {
      console.warn(JSON.stringify({ 
        event: 'invalid_asaas_webhook', 
        message: 'Assinatura inválida no webhook Asaas', 
        token_provided: !!token 
      }));
      // Como boa prática, retornamos 200 no webhook se for inválido mas conhecido, 
      // ou 401 se quisermos que eles parem. Retornaremos 200 para fail silence se o secret tiver sido trocado
      return NextResponse.json({ erro: 'Forbidden' }, { status: 200 }); 
    }

    // Idempotência: Gera hash do payload
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    // Registra o webhook como recebido
    try {
      await prisma.webhookRecebido.create({
        data: {
          origem: 'asaas',
          payload_hash: payloadHash,
          processado: false,
        }
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        // Se já processou (violação da constraint unique), apenas avisa o Asaas que está OK
        return NextResponse.json({ received: true, status: 'already_processed' });
      }
      throw e;
    }

    const payload = JSON.parse(rawBody);

    // Trata o evento
    const eventType = payload.event;
    
    if (eventType === 'PAYMENT_RECEIVED' || eventType === 'PAYMENT_CONFIRMED') {
      const paymentId = payload.payment?.id;

      if (paymentId) {
        // Atualiza o Pedido no banco de dados
        const pedido = await prisma.pedido.findUnique({
          where: { asaas_payment_id: paymentId }
        });

        if (pedido && pedido.status !== 'pago') {
          // Padrão Outbox: Atualiza pedido e publica evento de domínio na mesma transação
          await prisma.$transaction([
            prisma.pedido.update({
              where: { id: pedido.id },
              data: { 
                status: 'pago',
                pago_em: new Date(),
              }
            }),
            prisma.domainEvent.create({
              data: {
                tipo: DomainEvents.PAGAMENTO_CONFIRMADO,
                payload: {
                  pedido_id: pedido.id,
                  lead_id: pedido.lead_id,
                  valor_centavos: pedido.valor_centavos,
                  payment_id: paymentId,
                }
              }
            })
          ]);
        }
      }
    }

    // Marca como processado
    await prisma.webhookRecebido.update({
      where: { payload_hash: payloadHash },
      data: { processado: true }
    });

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Asaas Webhook Error]:', error);
    // Retorna 500 para que o Asaas tente enviar novamente
    return NextResponse.json({ erro: 'Erro interno no processamento do webhook' }, { status: 500 });
  }
}
