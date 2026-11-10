/**
 * Cliente de Integração com Google Gemini para o WhatsApp / Instagram da CET.
 * Utiliza o modelo gemini-flash-lite-latest com fallback dinâmico para gemini-3.5-flash-lite e gemini-flash-latest.
 */

import { PROMPT_SISTEMA_ASSISTENTE_CET } from './prompt-assistente-cet';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';

export interface MensagemHistorico {
  autor: 'usuario' | 'assistente';
  texto: string;
}

export interface OpcoesGemini {
  nomeCliente?: string;
  protocolo?: string;
  linkFicha?: string;
  historico?: MensagemHistorico[];
}

const MODELOS_CANDIDATOS = [
  process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
];

const RESPOSTA_FALLBACK_DIAGNOSTICO =
  'Olá! Seja muito bem-vindo(a) à *CET – Segurança e Medicina do Trabalho*! 😊\n\n' +
  'Estou aqui para te ajudar a manter a sua empresa 100% regular perante o Ministério do Trabalho e eSocial, prevenindo multas e protegendo sua equipe.\n\n' +
  'O nosso primeiro passo essencial é realizar o *Diagnóstico de SST Gratuito* da sua empresa, identificando quais programas (PGR, PCMSO, LTCAT) e exames (ASO) são obrigatórios para a sua atividade.\n\n' +
  'Vamos iniciar o seu diagnóstico gratuito agora? Para começarmos, qual é o seu nome e CNPJ (ou ramo de atividade da sua empresa)?';

/**
 * Envia uma mensagem para o Gemini com o contexto pericial da CET e histórico.
 */
export async function gerarRespostaGeminiCET(
  mensagemUsuario: string,
  opcoes: OpcoesGemini = {},
): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[Gemini Client] GEMINI_API_KEY não configurada. Usando fallback de atendimento padrão.');
    return RESPOSTA_FALLBACK_DIAGNOSTICO;
  }

  // Prepara o prompt do sistema com dados dinâmicos
  let systemPrompt = PROMPT_SISTEMA_ASSISTENTE_CET;
  if (opcoes.nomeCliente) {
    systemPrompt = systemPrompt.replaceAll('{{nome}}', opcoes.nomeCliente);
  }
  if (opcoes.protocolo) {
    systemPrompt = systemPrompt.replaceAll('{{protocolo}}', opcoes.protocolo);
  }
  if (opcoes.linkFicha) {
    systemPrompt = systemPrompt.replaceAll('{{link_ficha}}', opcoes.linkFicha);
  } else {
    // Se não houver link, instrui a IA a convidar a passar o nome/CNPJ por mensagem
    systemPrompt = systemPrompt.replaceAll('{{link_ficha}}', 'nosso link exclusivo que enviarei logo após confirmarmos seu CNPJ');
  }

  // Monta histórico de mensagens para o Gemini
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (opcoes.historico && opcoes.historico.length > 0) {
    for (const msg of opcoes.historico.slice(-8)) {
      if (!msg.texto) continue;
      contents.push({
        role: msg.autor === 'usuario' ? 'user' : 'model',
        parts: [{ text: msg.texto }],
      });
    }
  }

  // Adiciona a mensagem atual do usuário
  contents.push({
    role: 'user',
    parts: [{ text: mensagemUsuario || 'Olá' }],
  });

  // Tenta chamar cada modelo candidato em ordem com timeout resiliente
  for (const model of MODELOS_CANDIDATOS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 500,
            topP: 0.95,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const erroData = await res.text();
        console.warn(`[Gemini API] Modelo ${model} retornou ${res.status}: ${erroData}`);
        continue; // Tenta o próximo modelo
      }

      const data = await res.json();
      const textoGerado = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textoGerado && textoGerado.trim()) {
        return textoGerado.trim();
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Falha no modelo ${model}:`, err.message);
    }
  }

  console.error('[Gemini Client] Todos os modelos candidatos falharam. Usando resposta fallback de vendas do Diagnóstico.');
  return RESPOSTA_FALLBACK_DIAGNOSTICO;
}
