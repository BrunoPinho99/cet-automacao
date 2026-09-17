import { prisma } from '@cet/db';

export interface EnviarMensagemInput {
  lead_id: string;
  conteudo: string;
  chave_idempotencia: string;
  template?: string;
  canal?: 'whatsapp' | 'instagram';
}

export async function enviarMensagem({
  lead_id,
  conteudo,
  chave_idempotencia,
  template,
  canal = 'whatsapp',
}: EnviarMensagemInput) {
  // 1. Deduplicação via chave de idempotência
  const existente = await prisma.mensagem.findUnique({
    where: { chave_idempotencia }
  });
  
  if (existente) {
    return existente;
  }

  // 2. Checagem da janela de 24h
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

  // 3. Regra de negócio: fora da janela só template; dentro, texto livre
  if (!dentroDaJanela && !template) {
    throw new Error('Janela de 24h fechada: obrigatório informar um template aprovado.');
  }

  // 4. Integração com API (Simulada para o MVP/Piloto)
  // Aqui entraria a chamada HTTP real para Cloud API / Graph API
  const mockWamid = `wamid.mock.${Date.now()}.${Math.random().toString(36).substring(7)}`;

  // 5. Salva log da mensagem no banco
  const mensagem = await prisma.mensagem.create({
    data: {
      lead_id,
      direcao: 'saida',
      canal,
      conteudo,
      template,
      wamid: mockWamid,
      status: 'enviada',
      chave_idempotencia,
    }
  });

  return mensagem;
}
