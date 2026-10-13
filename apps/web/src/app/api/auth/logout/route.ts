import { NextResponse } from 'next/server';
import { deleteSessionCookie } from '@/lib/auth';

export async function POST() {
  await deleteSessionCookie();
  return NextResponse.json({ success: true, redirect: '/login' });
}

export async function GET(req: Request) {
  // CRÍTICO: Ignora requisições de prefetch do navegador e do Next.js
  // para NUNCA deslogar o usuário em segundo plano por prefetch de links
  const purpose =
    req.headers.get('purpose') ||
    req.headers.get('sec-purpose') ||
    req.headers.get('x-purpose') ||
    req.headers.get('x-moz-purpose');

  if (purpose && purpose.toLowerCase().includes('prefetch')) {
    return new Response(null, { status: 204 });
  }

  // Se não for prefetch e for acesso explícito GET, desloga e redireciona
  await deleteSessionCookie();
  return NextResponse.redirect(new URL('/login', process.env.SITE_URL || 'https://cet-automacao.vercel.app'));
}
