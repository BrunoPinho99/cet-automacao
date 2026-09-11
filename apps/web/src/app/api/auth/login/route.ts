import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import * as argon2 from 'argon2';
import { signToken, createSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const senhaValida = await argon2.verify(usuario.senha_hash, senha);

    if (!senhaValida) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = await signToken({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.papel,
    });

    await createSessionCookie(token);

    return NextResponse.json({ success: true, redirect: '/admin' });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
