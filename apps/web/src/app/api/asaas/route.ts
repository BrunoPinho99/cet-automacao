import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { env } from 'node:process';
import crypto from 'node:crypto';

const ASAAS_WEBHOOK_SECRET = env.ASAAS_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const token = request.headers.get('asaas-access-token');

    // Validação de Segurança do Asaas
    if (!token || !ASAAS_WEBHOOK_SECRET) {
      return NextResponse.json({ erro: 'Unauthorized' }, { status: 401 });
    }

    // Compara tokens com timing safe para evitar timing attacks
    const isTokenValid = crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(ASAAS_WEBHOOK_SECRET)
    );

    if (!isTokenValid) {
      // Como boa prática, retornamos 200 no webhook se for inválido mas conhecido, 
      // ou 401 se quisermos que eles parem. Retornaremos 200 para fail silence se o secret tiver sido trocado
      return NextResponse.json({ erro: 'Forbidden' }, { status: 200 }); 
    }

    // Idempotência: Gera hash do payload
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    // Verifica se este webhook já foi recebido (Idempotência Pura)
    const webhookJaProcessado = await prisma.webhookRecebido.findUnique({
      where: { payload_hash: payloadHash }
    });

    if (webhookJaProcessado) {
      // Se já processou, apenas avisa o Asaas que está OK
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    // Registra o webhook como recebido
    await prisma.webhookRecebido.create({
      data: {
        origem: 'asaas',
        payload_hash: payloadHash,
        processado: false,
      }
    });

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
          await prisma.pedido.update({
            where: { id: pedido.id },
            data: { 
              status: 'pago',
              pago_em: new Date(),
            }
          });

          // Padrão Outbox: Publica evento de domínio para gerar relatório
          await prisma.domainEvent.create({
            data: {
              tipo: 'PAGAMENTO_CONFIRMADO',
              payload: {
                pedido_id: pedido.id,
                lead_id: pedido.lead_id,
                valor_centavos: pedido.valor_centavos,
                payment_id: paymentId,
              }
            }
          });
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
