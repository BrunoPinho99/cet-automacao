import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { normalizarTelefone, gerarProtocolo } from '@/lib/validacoes';

const INSTAGRAM_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'cet_instagram_2026';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';

/**
 * GET /api/instagram
 * Validação do webhook pela Meta (challenge).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === INSTAGRAM_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
}

/**
 * POST /api/instagram
 * Recebe mensagens do Instagram Messaging API.
 * 
 * O Instagram não tem a mesma riqueza de mensagens interativas do WhatsApp,
 * então o fluxo é mais simples: captura a mensagem, cria lead e envia link da ficha.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Validação de assinatura
    if (INSTAGRAM_APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (signature) {
        const hmac = crypto.createHmac('sha256', INSTAGRAM_APP_SECRET);
        hmac.update(rawBody);
        const expectedSignature = `sha256=${hmac.digest('hex')}`;
        if (signature !== expectedSignature) {
          console.warn('⚠️ Assinatura do Instagram inválida');
          return NextResponse.json({ received: true }, { status: 200 });
        }
      }
    }

    const payload = JSON.parse(rawBody);

    if (payload.object === 'instagram' && payload.entry) {
      for (const entry of payload.entry) {
        if (entry.messaging) {
          for (const event of entry.messaging) {
            const senderId = event.sender?.id;
            const messageText = event.message?.text;
            const messageId = event.message?.mid;

            if (!senderId || !messageText) continue;

            console.log(`[Instagram] Mensagem de ${senderId}: ${messageText} [mid: ${messageId}]`);

            // Deduplicação por message ID
            if (messageId) {
              const jaProcessada = await prisma.mensagem.findFirst({
                where: { wamid: messageId },
              });
              if (jaProcessada) continue;
            }

            // Criar contato (Instagram não fornece telefone, usamos o sender_id)
            const idInstagram = `ig_${senderId}`;
            let contato = await prisma.contato.findFirst({
              where: { telefone_e164: idInstagram },
              include: { leads: { orderBy: { criado_em: 'desc' }, take: 1 } },
            });

            if (!contato) {
              contato = await prisma.contato.create({
                data: {
                  nome: `Instagram ${senderId}`,
                  telefone_e164: idInstagram,
                  canal_preferido: 'instagram',
                },
                include: { leads: { orderBy: { criado_em: 'desc' }, take: 1 } },
              });
            }

            // Se não tem lead, criar um
            if (!contato.leads || contato.leads.length === 0) {
              const protocolo = gerarProtocolo();
              const lead = await prisma.lead.create({
                data: {
                  contato_id: contato.id,
                  canal: 'instagram',
                  primeira_intencao: messageText.substring(0, 500),
                  protocolo,
                },
              });

              // Registrar mensagem
              await prisma.mensagem.create({
                data: {
                  lead_id: lead.id,
                  direcao: 'entrada',
                  canal: 'instagram',
                  wamid: messageId || undefined,
                  conteudo: messageText,
                  status: 'recebida',
                },
              });

              console.log(`[Instagram] Lead criado: ${protocolo} para ${senderId}`);
            } else {
              // Lead já existe — registrar mensagem
              await prisma.mensagem.create({
                data: {
                  lead_id: contato.leads[0].id,
                  direcao: 'entrada',
                  canal: 'instagram',
                  wamid: messageId || undefined,
                  conteudo: messageText,
                  status: 'recebida',
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Instagram Webhook Error]', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
