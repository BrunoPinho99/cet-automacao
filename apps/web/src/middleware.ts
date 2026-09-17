import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { podeAcessarRota } from '@/lib/rbac';

export async function middleware(request: NextRequest) {
  // Proteger rota /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('cet_admin_session')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);

    if (!payload) {
      // Token inválido ou expirado
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verificação de RBAC baseada na rota e no papel do usuário
    const path = request.nextUrl.pathname;
    if (!podeAcessarRota(path, payload.role)) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ erro: 'Acesso negado para o seu perfil.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/admin/forbidden', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
