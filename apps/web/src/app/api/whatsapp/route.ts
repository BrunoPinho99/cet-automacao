import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { processarMensagem } from '@/lib/orquestrador-whatsapp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Filtra apenas eventos de novas mensagens recebidas
    if (body.event === 'messages.upsert') {
      const messageData = body.data;

      // Ignora mensagens enviadas pelo próprio bot
      if (messageData.key?.fromMe) {
        return NextResponse.json({ status: 'ignored_from_me' });
      }

      // Extrai número do remetente (formato: 551199999999@s.whatsapp.net)
      const sender = messageData.key?.remoteJid?.replace('@s.whatsapp.net', '');
      
      // Extrai o conteúdo do texto recebido
      const messageText = 
        messageData.message?.conversation || 
        messageData.message?.extendedTextMessage?.text || 
        '';

      const wamid = messageData.key?.id;

      if (messageText && sender && wamid) {
        // Prevenção de duplicidade por WAMID
        const mensagemExistente = await prisma.mensagem.findUnique({
          where: { wamid }
        });

        if (!mensagemExistente) {
          // Tenta achar o contato. Cria se não existe.
          let contato = await prisma.contato.findUnique({
            where: { telefone_e164: sender },
            include: { leads: { orderBy: { criado_em: 'desc' }, take: 1 } }
          });

          if (!contato) {
            contato = await prisma.contato.create({
              data: {
                telefone_e164: sender,
                nome: messageData.pushName || sender,
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
              conteudo: messageText,
              status: 'recebido'
            }
          });

          // Em vez de usar DomainEvent (Outbox), processa imediatamente via orquestrador
          // para dar uma resposta instantânea pelo WhatsApp
          
          let tipoMensagem: 'text' | 'interactive' | 'button' = 'text';
          let interactiveId = undefined;

          if (messageData.message?.listResponseMessage) {
            tipoMensagem = 'interactive';
            interactiveId = messageData.message.listResponseMessage.singleSelectReply.selectedRowId;
          } else if (messageData.message?.buttonsResponseMessage) {
            tipoMensagem = 'button';
            interactiveId = messageData.message.buttonsResponseMessage.selectedButtonId;
          } else if (messageData.message?.templateButtonReplyMessage) {
             tipoMensagem = 'button';
             interactiveId = messageData.message.templateButtonReplyMessage.selectedId;
          }

          // Roda em background (não bloqueia o retorno 200 OK para a Evolution)
          processarMensagem(sender, wamid, tipoMensagem, messageText, interactiveId).catch((err) => {
             console.error('[Orquestrador] Erro ao processar mensagem:', err);
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao processar webhook da Evolution API:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
