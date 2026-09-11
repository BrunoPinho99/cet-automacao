import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@cet/db';

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'cet_seguranca_2026';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

/**
 * GET /api/whatsapp
 * Validação do webhook pela Meta (challenge).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
}

/**
 * POST /api/whatsapp
 * Recebe eventos do WhatsApp Cloud API e despacha para o banco e filas.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    
    // Validação de assinatura HMAC
    if (process.env.NODE_ENV === 'production' || WHATSAPP_APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        return NextResponse.json({ received: true }, { status: 200 }); // Fail silent
      }

      const hmac = crypto.createHmac('sha256', WHATSAPP_APP_SECRET);
      hmac.update(rawBody);
      const expectedBuffer = Buffer.from(`sha256=${hmac.digest('hex')}`, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (
        expectedBuffer.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
      ) {
        return NextResponse.json({ received: true }, { status: 200 }); // Fail silent
      }
    }

    // Validação de Idempotência pelo hash do Payload
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const webhookJaProcessado = await prisma.webhookRecebido.findUnique({
      where: { payload_hash: payloadHash }
    });

    if (webhookJaProcessado) {
      return NextResponse.json({ received: true, status: 'already_processed' }, { status: 200 });
    }

    // Registra Webhook
    await prisma.webhookRecebido.create({
      data: {
        origem: 'meta',
        payload_hash: payloadHash,
        processado: false,
      }
    });

    const payload = JSON.parse(rawBody);

    if (payload.object === 'whatsapp_business_account' && payload.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;
          const value = change.value;

          // Processar mensagens recebidas
          if (value.messages) {
            for (const message of value.messages) {
              const telefone = message.from;
              const wamid = message.id;

              let tipo = 'text';
              let conteudo = '';

              if (message.type === 'text') {
                conteudo = message.text?.body || '';
              } else if (message.type === 'interactive') {
                if (message.interactive?.type === 'button_reply') {
                  conteudo = message.interactive.button_reply?.title || '';
                } else if (message.interactive?.type === 'list_reply') {
                  conteudo = message.interactive.list_reply?.title || '';
                }
              }

              // Prevenção de duplicidade por WAMID
              const mensagemExistente = await prisma.mensagem.findUnique({
                where: { wamid }
              });

              if (!mensagemExistente) {
                // Tenta achar o contato. Cria se não existe.
                let contato = await prisma.contato.findUnique({
                  where: { telefone_e164: telefone },
                  include: { leads: { orderBy: { criado_em: 'desc' }, take: 1 } }
                });

                if (!contato) {
                  contato = await prisma.contato.create({
                    data: {
                      telefone_e164: telefone,
                      nome: message.profile?.name || telefone,
                    },
                    include: { leads: true }
                  });
                }

                let leadId = contato.leads && contato.leads.length > 0 ? contato.leads[0].id : null;

                if (!leadId) {
                  const lead = await prisma.lead.create({
                    data: {
                      contato_id: contato.id,
                      canal: 'whatsapp',
                      protocolo: `CET-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
                    }
                  });
                  leadId = lead.id;
                }

                // Cria a mensagem
                await prisma.mensagem.create({
                  data: {
                    lead_id: leadId,
                    direcao: 'entrada',
                    canal: 'whatsapp',
                    wamid: wamid,
                    conteudo: conteudo,
                    status: 'recebido'
                  }
                });

                // Cria o DomainEvent (Outbox) para disparar menu inicial via worker
                await prisma.domainEvent.create({
                  data: {
                    tipo: 'WHATSAPP_MENSAGEM_RECEBIDA',
                    payload: { leadId, telefone, conteudo }
                  }
                });
              }
            }
          }
        }
      }
    }

    // Marca webhook como processado
    await prisma.webhookRecebido.update({
      where: { payload_hash: payloadHash },
      data: { processado: true }
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]', error);
    // Sempre 200
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
