import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { processarMensagem } from '@/lib/orquestrador-whatsapp';

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
 * Recebe eventos do WhatsApp Cloud API e despacha para o orquestrador.
 * 
 * REGRA ABSOLUTA: Sempre retornar HTTP 200 — caso contrário, a Meta
 * desativa o webhook após falhas consecutivas.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    
    // Validação de assinatura HMAC
    if (WHATSAPP_APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (signature) {
        const hmac = crypto.createHmac('sha256', WHATSAPP_APP_SECRET);
        hmac.update(rawBody);
        const expectedSignature = `sha256=${hmac.digest('hex')}`;
        if (signature !== expectedSignature) {
          console.warn('⚠️ Assinatura do WhatsApp inválida — ignorando payload');
          return NextResponse.json({ received: true }, { status: 200 });
        }
      }
    }

    const payload = JSON.parse(rawBody);

    if (payload.object === 'whatsapp_business_account' && payload.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;
          const value = change.value;

          // Processar mensagens recebidas
          if (value.messages) {
            for (const message of value.messages) {
              const from = message.from;
              const wamid = message.id;
              const timestamp = message.timestamp;

              let tipo: 'text' | 'interactive' | 'button' = 'text';
              let conteudo = '';
              let interactiveId: string | undefined;

              switch (message.type) {
                case 'text':
                  tipo = 'text';
                  conteudo = message.text?.body || '';
                  break;

                case 'interactive':
                  tipo = 'interactive';
                  if (message.interactive?.type === 'button_reply') {
                    interactiveId = message.interactive.button_reply?.id;
                    conteudo = message.interactive.button_reply?.title || '';
                  } else if (message.interactive?.type === 'list_reply') {
                    interactiveId = message.interactive.list_reply?.id;
                    conteudo = message.interactive.list_reply?.title || '';
                  }
                  break;

                case 'button':
                  tipo = 'button';
                  interactiveId = message.button?.payload;
                  conteudo = message.button?.text || '';
                  break;

                default:
                  // Tipos não suportados: imagem, áudio, documento, etc.
                  console.log(`[WhatsApp] Tipo não suportado: ${message.type} de ${from}`);
                  continue;
              }

              console.log(`[WhatsApp] ${from} (${tipo}): ${conteudo} [wamid: ${wamid}]`);

              // Despachar para o orquestrador (sem await para não bloquear o 200)
              processarMensagem(from, wamid, tipo, conteudo, interactiveId).catch(err => {
                console.error(`[WhatsApp] Erro no orquestrador para ${from}:`, err);
              });
            }
          }

          // Processar atualizações de status (delivered, read, failed)
          if (value.statuses) {
            for (const status of value.statuses) {
              console.log(
                `[WhatsApp Status] ${status.recipient_id}: ${status.status} [wamid: ${status.id}]`,
              );
              // Em produção: atualizar status da mensagem no banco
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]', error);
    // REGRA ABSOLUTA: sempre 200
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
