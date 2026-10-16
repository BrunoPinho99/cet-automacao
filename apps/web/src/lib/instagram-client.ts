/**
 * Cliente oficial para envio de mensagens via Instagram Messaging API (Meta Graph API).
 */

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const GRAPH_API_VERSION = 'v21.0';

export interface EnvioInstagramResult {
  sucesso: boolean;
  messageId?: string;
  recipientId?: string;
  erro?: string;
}

/**
 * Envia uma mensagem de texto no Direct do Instagram usando a Graph API da Meta.
 * @param recipientId IGSID (Instagram-Scoped ID) do usuário que iniciou a conversa no Direct
 * @param texto Conteúdo textual da mensagem
 */
export async function enviarMensagemInstagram(
  recipientId: string,
  texto: string
): Promise<EnvioInstagramResult> {
  if (!INSTAGRAM_ACCESS_TOKEN || INSTAGRAM_ACCESS_TOKEN === 'OBTER_NO_META_DEVELOPER_PORTAL') {
    console.warn('[Instagram Client] INSTAGRAM_ACCESS_TOKEN não configurado — simulando envio no console:');
    console.log(`[Instagram Direct Simulado -> ${recipientId}]:\n${texto}`);
    return {
      sucesso: true,
      messageId: `simulado_ig_${Date.now()}`,
      recipientId,
    };
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: texto },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msgErro = data?.error?.message || 'Falha desconhecida na API do Instagram';
      console.error('[Instagram API Error]:', data);
      return {
        sucesso: false,
        erro: msgErro,
      };
    }

    return {
      sucesso: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    };
  } catch (error: any) {
    console.error('[Instagram Client Exception]:', error);
    return {
      sucesso: false,
      erro: error.message || 'Erro de comunicação com a Meta Graph API',
    };
  }
}
