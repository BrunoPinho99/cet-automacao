/**
 * Remove toda formatação (pontos, barras, traços) e deixa apenas os números do CNPJ.
 * Se for nulo ou vazio, retorna a mesma string.
 */
export function normalizarCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  return cnpj.replace(/[^\d]/g, '');
}
