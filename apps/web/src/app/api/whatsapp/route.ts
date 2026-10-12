import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { processarMensagem } from '@/lib/orquestrador-whatsapp';

/**
 * Validação de Webhook da Meta (Handshake GET)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'cet_seguranca_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    console.error('[WhatsApp Webhook GET] Erro de validação:', error);
    return new Response('Forbidden', { status: 403 });
  }
}

/**
 * Recebimento de Mensagens (POST - Compatível com Meta Cloud API e Evolution API)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      // Regra absoluta do WhatsApp Webhook: responder 200 OK mesmo com payload mal formatado
      return new Response(JSON.stringify({ status: 'ok', warning: 'invalid_json' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. FORMATO META CLOUD API (whatsapp_business_account)
    if (body.object === 'whatsapp_business_account' && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (!Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
          const val = change.value;
          if (!val) continue;

          // Se for evento de atualização de status (delivered, sent, read)
          if (Array.isArray(val.statuses)) {
            for (const status of val.statuses) {
              if (status.id && status.status) {
                await prisma.mensagem
                  .updateMany({
                    where: { wamid: status.id },
                    data: { status: status.status },
                  })
                  .catch(() => {});
              }
            }
          }

          // Se for evento de novas mensagens
          if (Array.isArray(val.messages)) {
            for (const msg of val.messages) {
              const sender = msg.from;
              const wamid = msg.id;
              let tipoMensagem: 'text' | 'interactive' | 'button' = 'text';
              let messageText = '';
              let interactiveId: string | undefined;

              if (msg.type === 'text') {
                messageText = msg.text?.body || '';
              } else if (msg.type === 'interactive') {
                tipoMensagem = 'interactive';
                if (msg.interactive?.type === 'button_reply') {
                  tipoMensagem = 'button';
                  interactiveId = msg.interactive.button_reply?.id;
                  messageText = msg.interactive.button_reply?.title || '';
                } else if (msg.interactive?.type === 'list_reply') {
                  interactiveId = msg.interactive.list_reply?.id;
                  messageText = msg.interactive.list_reply?.title || '';
                }
              }

              if (sender && wamid) {
                processarMensagem(sender, wamid, tipoMensagem, messageText, interactiveId).catch(err => {
                  console.error('[Meta Webhook] Erro ao processar:', err);
                });
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. FORMATO EVOLUTION API (messages.upsert)
    if (body.event === 'messages.upsert' && body.data) {
      const messageData = body.data;

      // Ignora mensagens enviadas pelo próprio bot
      if (messageData.key?.fromMe) {
        return new Response(JSON.stringify({ status: 'ignored_from_me' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const sender = messageData.key?.remoteJid?.replace('@s.whatsapp.net', '');
      const messageText =
        messageData.message?.conversation ||
        messageData.message?.extendedTextMessage?.text ||
        '';
      const wamid = messageData.key?.id;

      if (sender && wamid) {
        let tipoMensagem: 'text' | 'interactive' | 'button' = 'text';
        let interactiveId: string | undefined;

        if (messageData.message?.listResponseMessage) {
          tipoMensagem = 'interactive';
          interactiveId = messageData.message.listResponseMessage.singleSelectReply?.selectedRowId;
        } else if (messageData.message?.buttonsResponseMessage) {
          tipoMensagem = 'button';
          interactiveId = messageData.message.buttonsResponseMessage.selectedButtonId;
        } else if (messageData.message?.templateButtonReplyMessage) {
          tipoMensagem = 'button';
          interactiveId = messageData.message.templateButtonReplyMessage.selectedId;
        }

        processarMensagem(sender, wamid, tipoMensagem, messageText, interactiveId).catch(err => {
          console.error('[Evolution Webhook] Erro ao processar:', err);
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Qualquer outro formato reconhecido com 200 OK para evitar repetições desnecessárias
    return new Response(JSON.stringify({ status: 'ignored' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[WhatsApp Webhook POST] Erro geral:', error);
    // Sempre responder 200 para webhooks de mensageria
    return new Response(JSON.stringify({ status: 'ok', handled_error: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
