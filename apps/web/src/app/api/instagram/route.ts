import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { gerarProtocolo } from '@/lib/validacoes';
import { enviarMensagemInstagram } from '@/lib/instagram-client';
import { verificarTriggerDiagnostico } from '@/lib/fluxo-conversa';
import { linkCurtoFicha } from '@/lib/link-curto';

const INSTAGRAM_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'cet_instagram_2026';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';

if (process.env.NODE_ENV === 'production' && !INSTAGRAM_APP_SECRET) {
  console.warn('⚠️ AVISO: INSTAGRAM_APP_SECRET não está definido nas variáveis de ambiente.');
}

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
 * Recebe mensagens do Instagram Messaging API e responde no Direct automaticamente.
 */
export async function POST(request: Request) {
  try {
    console.log('[Instagram Webhook] Recebida chamada POST:', rawBody);

    // Validação de assinatura (apenas se houver um secret real configurado)
    if (INSTAGRAM_APP_SECRET && INSTAGRAM_APP_SECRET !== 'OBTER_NO_META_DEVELOPER_PORTAL') {
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        console.warn('⚠️ Assinatura do Instagram ausente — ignorando payload');
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const hmac = crypto.createHmac('sha256', INSTAGRAM_APP_SECRET);
      hmac.update(rawBody);
      const expectedBuffer = Buffer.from(`sha256=${hmac.digest('hex')}`, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (
        expectedBuffer.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
      ) {
        console.warn('⚠️ Assinatura do Instagram inválida — ignorando payload');
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    const payload = JSON.parse(rawBody);

    if ((payload.object === 'instagram' || payload.object === 'page') && payload.entry) {
      for (const entry of payload.entry) {
        if (entry.messaging) {
          for (const event of entry.messaging) {
            const senderId = event.sender?.id;
            const messageText = event.message?.text || event.postback?.title || event.message?.quick_reply?.payload;
            const messageId = event.message?.mid;
            const pageId = event.recipient?.id || entry.id;

            if (!senderId || !messageText) continue;

            console.log(`[Instagram] Mensagem de ${senderId}: ${messageText} [mid: ${messageId}]`);

            // Deduplicação por message ID
            if (messageId) {
              const jaProcessada = await prisma.mensagem.findFirst({
                where: { wamid: messageId },
              });
              if (jaProcessada) continue;
            }

            // 1. Localizar ou criar contato do Instagram
            const idInstagram = `ig_${senderId}`;
            let contato = await prisma.contato.findFirst({
              where: { telefone_e164: idInstagram },
              include: {
                leads: {
                  orderBy: { criado_em: 'desc' },
                  take: 1,
                  include: { fichas: { orderBy: { criado_em: 'desc' }, take: 1 } },
                },
              },
            });

            if (!contato) {
              contato = await prisma.contato.create({
                data: {
                  nome: `Instagram ${senderId.slice(-6)}`,
                  telefone_e164: idInstagram,
                  canal_preferido: 'instagram',
                },
                include: {
                  leads: {
                    orderBy: { criado_em: 'desc' },
                    take: 1,
                    include: { fichas: { orderBy: { criado_em: 'desc' }, take: 1 } },
                  },
                },
              });
            }

            const isTriggerDiagnostico = verificarTriggerDiagnostico(messageText);

            // 2. Localizar ou criar Lead
            let lead = contato.leads?.[0];
            if (!lead) {
              const protocolo = gerarProtocolo();
              lead = await prisma.lead.create({
                data: {
                  contato_id: contato.id,
                  canal: 'instagram',
                  primeira_intencao: isTriggerDiagnostico ? 'Diagnóstico Completo da Empresa' : messageText.substring(0, 500),
                  protocolo,
                },
                include: { fichas: true },
              });
              console.log(`[Instagram] Lead criado: ${protocolo} para ${senderId}`);
            }

            // 3. Registrar mensagem de entrada
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

            // 4. Localizar ou gerar Ficha Inteligente
            let ficha = lead.fichas?.[0];
            if (!ficha) {
              ficha = await prisma.ficha.create({
                data: {
                  lead_id: lead.id,
                  status: 'iniciada',
                  bloco_atual: 1,
                  respostas: {},
                },
              });
            }

            const linkFicha = linkCurtoFicha(ficha.token_retomada);

            // 5. Montar resposta no Direct
            let respostaTexto = '';
            if (isTriggerDiagnostico) {
              respostaTexto = `Olá! Seja muito bem-vindo(a) à CET – Segurança e Medicina do Trabalho! 😊\n\nExcelente iniciativa! Vamos preparar o Diagnóstico Completo de SST da sua empresa para mapear pendências com as Normas Regulamentadoras (NRs), grau de risco e eSocial.\n\nAcesse o link abaixo para iniciar o preenchimento da ficha técnica:\n👉 ${linkFicha}\n\n(Leva menos de 3 minutinhos e você preenche direto pelo celular!)`;
            } else {
              respostaTexto = `Olá! Tudo bem? Seja muito bem-vindo(a) à CET – Segurança e Medicina do Trabalho! 😊\n\nIdentifiquei seu contato. Para consultar a regularidade da sua empresa e emitir seu Diagnóstico Completo de SST, basta acessar sua ficha técnica:\n👉 ${linkFicha}\n\nOu responda com: "quero receber um diagnostico da minha empresa" para iniciarmos agora!`;
            }

            // 6. Enviar resposta no Direct do Instagram
            const envio = await enviarMensagemInstagram(senderId, respostaTexto, pageId);

            // 7. Registrar mensagem de saída
            await prisma.mensagem.create({
              data: {
                lead_id: lead.id,
                direcao: 'saida',
                canal: 'instagram',
                wamid: envio.messageId || `ig_out_${Date.now()}`,
                conteudo: respostaTexto,
                status: envio.sucesso ? 'entregue' : 'falha',
                erro: envio.erro,
              },
            });
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
