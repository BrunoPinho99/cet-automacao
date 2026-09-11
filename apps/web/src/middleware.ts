import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

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

    // Role verification logic could go here later if needed
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
