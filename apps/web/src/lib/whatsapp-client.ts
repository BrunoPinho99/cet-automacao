/**
 * Cliente para a Evolution API.
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'cet_automacao';
const API_KEY = process.env.EVOLUTION_API_KEY || '';

interface EnvioResult {
  sucesso: boolean;
  wamid?: string;
  erro?: string;
}

export async function enviarMensagemWhatsApp(numeroDestino: string, texto: string) {
  // Limpa caracteres especiais mantendo apenas dígitos (ex: 5511999999999)
  const numeroLimpo = numeroDestino.replace(/\D/g, '');

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      number: numeroLimpo,
      text: texto,
      delay: 1200, // Simula digitação para reduzir risco de bloqueio
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro ao enviar mensagem via Evolution API: ${errorData}`);
  }

  return response.json();
}

/**
 * Envia mensagem de texto simples.
 */
export async function enviarTexto(para: string, texto: string): Promise<EnvioResult> {
  try {
    const res = await enviarMensagemWhatsApp(para, texto);
    return { sucesso: true, wamid: res.key?.id };
  } catch (err: any) {
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
