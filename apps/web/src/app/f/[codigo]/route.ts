import { NextResponse } from 'next/server';
import { expandirToken } from '@/lib/link-curto';

/**
 * GET /f/[codigo]
 * Link curto enviado no WhatsApp/Instagram. Redireciona para a Ficha Inteligente.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  const token = expandirToken(codigo || '');
  const destino = token ? `/ficha/${token}` : '/';
  return NextResponse.redirect(new URL(destino, request.url), 307);
}
