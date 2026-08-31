/**
 * Cliente para a WhatsApp Cloud API (Meta).
 * Envio de mensagens de texto, interativas (botões/listas) e templates.
 * 
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';

interface EnvioResult {
  sucesso: boolean;
  wamid?: string;
  erro?: string;
}

/**
 * Envia requisição genérica para a API do WhatsApp.
 */
async function enviarParaWhatsApp(payload: Record<string, unknown>): Promise<EnvioResult> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn('[WhatsApp] Credenciais não configuradas — mensagem não enviada.');
    return { sucesso: false, erro: 'Credenciais não configuradas' };
  }

  try {
    const res = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp] Erro no envio:', JSON.stringify(data));
      return { sucesso: false, erro: data.error?.message || 'Erro desconhecido' };
    }

    const wamid = data.messages?.[0]?.id;
    return { sucesso: true, wamid };
  } catch (error) {
    console.error('[WhatsApp] Erro de rede:', error);
    return { sucesso: false, erro: 'Erro de conexão com a API' };
  }
}

/**
 * Envia mensagem de texto simples.
 */
export async function enviarTexto(para: string, texto: string): Promise<EnvioResult> {
  return enviarParaWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: para,
    type: 'text',
    text: { body: texto },
  });
}

/**
 * Envia mensagem interativa com botões (máximo 3 botões).
 */
export async function enviarBotoes(
  para: string,
  corpo: string,
  botoes: Array<{ id: string; titulo: string }>,
  cabecalho?: string,
  rodape?: string,
): Promise<EnvioResult> {
  return enviarParaWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: para,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(cabecalho ? { header: { type: 'text', text: cabecalho } } : {}),
      body: { text: corpo },
      ...(rodape ? { footer: { text: rodape } } : {}),
      action: {
        buttons: botoes.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.titulo },
        })),
      },
    },
  });
}

/**
 * Envia mensagem interativa com lista de opções (até 10 itens por seção).
 */
export async function enviarLista(
  para: string,
  corpo: string,
  botaoTexto: string,
  secoes: Array<{
    titulo: string;
    itens: Array<{ id: string; titulo: string; descricao?: string }>;
  }>,
  cabecalho?: string,
  rodape?: string,
): Promise<EnvioResult> {
  return enviarParaWhatsApp({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: para,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(cabecalho ? { header: { type: 'text', text: cabecalho } } : {}),
      body: { text: corpo },
      ...(rodape ? { footer: { text: rodape } } : {}),
      action: {
        button: botaoTexto,
        sections: secoes.map(s => ({
          title: s.titulo,
          rows: s.itens.map(item => ({
            id: item.id,
            title: item.titulo,
            ...(item.descricao ? { description: item.descricao } : {}),
          })),
        })),
      },
    },
  });
}

/**
 * Envia template pré-aprovado (HSM).
 * Usado para iniciar conversas (fora da janela de 24h).
 */
export async function enviarTemplate(
  para: string,
  nomeTemplate: string,
  idioma: string = 'pt_BR',
  componentes?: Array<Record<string, unknown>>,
): Promise<EnvioResult> {
  return enviarParaWhatsApp({
    messaging_product: 'whatsapp',
    to: para,
    type: 'template',
    template: {
      name: nomeTemplate,
      language: { code: idioma },
      ...(componentes ? { components: componentes } : {}),
    },
  });
}

/**
 * Marca mensagem como lida (blue ticks).
 */
export async function marcarComoLida(wamid: string): Promise<void> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) return;

  try {
    await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: wamid,
      }),
    });
  } catch (error) {
    console.error('[WhatsApp] Erro ao marcar como lida:', error);
  }
}
