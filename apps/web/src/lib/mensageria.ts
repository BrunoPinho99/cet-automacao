import { prisma } from '@cet/db';
import { enviarTexto } from './whatsapp-client';

export interface EnviarMensagemInput {
  lead_id: string;
  conteudo: string;
  chave_idempotencia: string;
  template?: string;
  canal?: 'whatsapp' | 'instagram';
  ignorarJanela24h?: boolean;
}

export async function enviarMensagem({
  lead_id,
  conteudo,
  chave_idempotencia,
  template,
  canal = 'whatsapp',
  ignorarJanela24h = false,
}: EnviarMensagemInput) {
  // 1. Deduplicação via chave de idempotência
  const existente = await prisma.mensagem.findUnique({
    where: { chave_idempotencia }
  });
  
  if (existente) {
    return existente;
  }

  // 2. Busca o lead e contato associado
  const lead = await prisma.lead.findUnique({
    where: { id: lead_id },
    include: { contato: true }
  });

  // 3. Checagem da janela de 24h (para regras estritas de automação quando não for manual)
  if (!ignorarJanela24h) {
    const ultimaMensagemContato = await prisma.mensagem.findFirst({
      where: { lead_id, direcao: 'entrada' },
      orderBy: { criado_em: 'desc' }
    });

    const agora = new Date();
    let dentroDaJanela = false;

    if (ultimaMensagemContato) {
      const horasDesdeUltima = (agora.getTime() - ultimaMensagemContato.criado_em.getTime()) / (1000 * 60 * 60);
      if (horasDesdeUltima <= 24) {
        dentroDaJanela = true;
      }
    }

    if (!dentroDaJanela && !template) {
      throw new Error('Janela de 24h fechada: obrigatório informar um template aprovado.');
    }
  }

  // 4. Integração Real com WhatsApp (Evolution API)
  let realWamid = `wamid.${Date.now()}.${Math.random().toString(36).substring(7)}`;
  let statusEnvio = 'enviada';
  let erroEnvio: string | undefined = undefined;

  if (canal === 'whatsapp' && lead?.contato?.telefone_e164) {
    try {
      const envioResult = await enviarTexto(lead.contato.telefone_e164, conteudo);
      if (envioResult.sucesso) {
        if (envioResult.wamid) {
          realWamid = envioResult.wamid;
        }
        statusEnvio = 'entregue';
      } else {
        console.warn(`[Mensageria] Falha ao enviar para ${lead.contato.telefone_e164}:`, envioResult.erro);
        statusEnvio = 'falha';
        erroEnvio = envioResult.erro;
      }
    } catch (err: any) {
      console.error('[Mensageria] Erro ao comunicar com Evolution API:', err);
      statusEnvio = 'falha';
      erroEnvio = err.message;
    }
  }

  // 5. Salva log da mensagem no banco
  const mensagem = await prisma.mensagem.create({
    data: {
      lead_id,
      direcao: 'saida',
      canal,
      conteudo,
      template,
      wamid: realWamid,
      status: statusEnvio,
      erro: erroEnvio,
      chave_idempotencia,
    }
  });

  return mensagem;
}
