import crypto from 'crypto';

export const TEXTO_CONSENTIMENTO_V1 = 'Para seguirmos com o seu diagnóstico, precisamos tratar alguns dados da sua empresa. Você concorda com nossa Política de Privacidade?';
export const VERSAO_CONSENTIMENTO_ATUAL = '1.0';

export function getHashConsentimento(): string {
  return crypto.createHash('sha256').update(TEXTO_CONSENTIMENTO_V1).digest('hex');
}
