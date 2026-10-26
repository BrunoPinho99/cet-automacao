/**
 * Cliente de Integração com Google Gemini para o WhatsApp / Instagram da CET.
 * Utiliza o modelo gemini-1.5-flash ou gemini-2.0-flash para atendimento ágil e humanizado.
 */

import { PROMPT_SISTEMA_ASSISTENTE_CET } from './prompt-assistente-cet';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

interface MensagemHistorico {
  autor: 'usuario' | 'assistente';
  texto: string;
}

interface OpcoesGemini {
  nomeCliente?: string;
  protocolo?: string;
  linkFicha?: string;
  historico?: MensagemHistorico[];
}

/**
 * Envia uma mensagem para o Gemini com o contexto pericial da CET e histórico.
 */
export async function gerarRespostaGeminiCET(
  mensagemUsuario: string,
  opcoes: OpcoesGemini = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[Gemini Client] GEMINI_API_KEY não configurada. Usando fallback de atendimento padrão.');
    return (
      'Olá! Sou a assistente virtual da CET — Segurança e Medicina do Trabalho.\n\n' +
      'Estou pronta para te ajudar com PGR, PCMSO, exames ocupacionais (ASO) e eSocial.\n\n' +
      'Como posso ajudar a sua empresa hoje?'
    );
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
  }

  // Monta histórico de mensagens para o Gemini
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (opcoes.historico && opcoes.historico.length > 0) {
    for (const msg of opcoes.historico.slice(-8)) {
      contents.push({
        role: msg.autor === 'usuario' ? 'user' : 'model',
        parts: [{ text: msg.texto }],
      });
    }
  }

  // Adiciona a mensagem atual do usuário
  contents.push({
    role: 'user',
    parts: [{ text: mensagemUsuario }],
  });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
          maxOutputTokens: 600,
          topP: 0.95,
        },
      }),
    });

    if (!res.ok) {
      const erroData = await res.text();
      console.error('[Gemini API] Erro na requisição:', res.status, erroData);
      throw new Error(`Erro Gemini (${res.status})`);
    }

    const data = await res.json();
    const textoGerado = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoGerado) {
      throw new Error('Nenhum texto retornado pelo Gemini');
    }

    return textoGerado.trim();
  } catch (err: any) {
    console.error('[Gemini Client] Falha ao gerar resposta:', err.message);
    return (
      'Obrigado pelo contato! Para podermos verificar a situação e os programas de SST obrigatórios da sua empresa (PGR, PCMSO e eSocial), informe por favor o seu nome e CNPJ, ou digite 6 para falar com um consultor.'
    );
  }
}
