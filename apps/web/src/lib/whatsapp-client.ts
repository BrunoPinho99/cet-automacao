/**
 * Cliente para a Evolution API.
 */

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const GRAPH_API_VERSION = 'v21.0';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'cet_automacao';
const API_KEY = process.env.EVOLUTION_API_KEY || 'cet_api_key_secreta_2026';

interface EnvioResult {
  sucesso: boolean;
  wamid?: string;
  erro?: string;
}

export async function enviarMensagemWhatsApp(numeroDestino: string, texto: string) {
  // Limpa caracteres especiais mantendo apenas dígitos (ex: 5563999999999)
  const numeroLimpo = numeroDestino.replace(/\D/g, '');

  // 1. Suporte Oficial: Meta WhatsApp Cloud API (Graph API)
  if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: numeroLimpo,
        type: 'text',
        text: { preview_url: false, body: texto },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msgErro = data?.error?.message || 'Erro ao enviar via Meta Cloud API';
      throw new Error(`Erro Meta WhatsApp: ${msgErro}`);
    }

    const messageId = data?.messages?.[0]?.id;
    return {
      key: { id: messageId },
      messages: data.messages,
    };
  }

  // 2. Alternativa: Evolution API (WhatsApp QR Code / Instância Própria)
  if (EVOLUTION_API_URL) {
    // delay configurável via ENV (padrão 0 para máxima velocidade de resposta do gatilho)
    const delayMs = process.env.WHATSAPP_TYPING_DELAY_MS !== undefined
      ? Number(process.env.WHATSAPP_TYPING_DELAY_MS)
      : 0;

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: API_KEY,
      },
      body: JSON.stringify({
        number: numeroLimpo,
        text: texto,
        delay: delayMs,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erro ao enviar mensagem via Evolution API: ${errorData}`);
    }

    return response.json();
  }

  // 3. Fallback de Desenvolvimento / Simulação
  console.warn('[WhatsApp Client] Nenhuma credencial de envio (Meta Cloud API ou Evolution) configurada — simulando:');
  console.log(`[WhatsApp Simulado -> ${numeroLimpo}]:\n${texto}`);
  return {
    key: { id: `simulado_wa_${Date.now()}` },
  };
}

/**
 * Envia mensagem de texto simples.
 */
export async function enviarTexto(para: string, texto: string): Promise<EnvioResult> {
  try {
    const res = await enviarMensagemWhatsApp(para, texto);
    return { sucesso: true, wamid: res.key?.id };
  } catch (err: any) {
    console.error(`[WhatsApp Client] Erro ao enviar mensagem para ${para}:`, err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Envia mensagem interativa com botões (fallback para texto).
 */
export async function enviarBotoes(
  para: string,
  corpo: string,
  botoes: Array<{ id: string; titulo: string }>,
  cabecalho?: string,
  rodape?: string,
): Promise<EnvioResult> {
  const texto = [
    cabecalho, 
    corpo, 
    botoes.map((b, i) => `${i+1}. ${b.titulo}`).join('\n'), 
    rodape
  ].filter(Boolean).join('\n\n');
  return enviarTexto(para, texto);
}

/**
 * Envia mensagem interativa com lista de opções (fallback para texto).
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
  let textoLista = secoes.map(s => {
    let secaoText = `*${s.titulo}*\n`;
    secaoText += s.itens.map((item, i) => `- ${item.titulo}${item.descricao ? ': ' + item.descricao : ''}`).join('\n');
    return secaoText;
  }).join('\n\n');

  const texto = [
    cabecalho, 
    corpo, 
    textoLista,
    `Responda digitando a opção desejada.`,
    rodape
  ].filter(Boolean).join('\n\n');
  
  return enviarTexto(para, texto);
}

/**
 * Envia template pré-aprovado (fallback para texto em dev).
 */
export async function enviarTemplate(
  para: string,
  nomeTemplate: string,
  idioma: string = 'pt_BR',
  componentes?: Array<Record<string, unknown>>,
): Promise<EnvioResult> {
  return enviarTexto(para, `[Template: ${nomeTemplate}]`);
}

/**
 * Marca mensagem como lida. (Na Evolution API isso pode ser configurado no webhook ou chamando endpoint próprio)
 */
export async function marcarComoLida(wamid: string): Promise<void> {
  // A Evolution API pode ter autoRead configurado globalmente ou ter endpoint: /chat/markMessageAsRead
  // Fica como no-op por enquanto
}
