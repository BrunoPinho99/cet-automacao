/**
 * Geração de links curtos para envio no WhatsApp / Instagram.
 *
 * Motivo: o token da ficha é um UUID (ex: ba2d2dcf-6e10-44fe-9df2-d1a43a7c5c53),
 * que tem exatamente o formato de uma "chave aleatória" Pix. O WhatsApp detecta
 * esse padrão e destaca o trecho como chave Pix, quebrando visualmente o link.
 *
 * Solução: enviar o token sem hífens em uma rota curta (/f/<32 hex>), que
 * redireciona para /ficha/<uuid>. Sem hífens o padrão Pix não é reconhecido.
 */

const SITE_URL_PADRAO = 'https://cet-automacao.vercel.app';

export function getSiteUrl(): string {
  return (process.env.SITE_URL || SITE_URL_PADRAO).replace(/\/+$/, '');
}

/** Remove hífens do UUID para evitar detecção como chave Pix. */
export function compactarToken(token: string): string {
  return token.replace(/-/g, '');
}

/** Reconstrói o UUID padrão (8-4-4-4-12) a partir do token compacto. */
export function expandirToken(codigo: string): string | null {
  const limpo = codigo.trim().toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(limpo)) {
    return limpo;
  }
  if (!/^[0-9a-f]{32}$/.test(limpo)) return null;
  return `${limpo.slice(0, 8)}-${limpo.slice(8, 12)}-${limpo.slice(12, 16)}-${limpo.slice(16, 20)}-${limpo.slice(20)}`;
}

/** Link curto e "seguro para WhatsApp" da Ficha Inteligente. */
export function linkCurtoFicha(token: string): string {
  return `${getSiteUrl()}/f/${compactarToken(token)}`;
}
