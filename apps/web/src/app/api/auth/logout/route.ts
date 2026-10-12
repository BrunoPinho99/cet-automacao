import { NextResponse } from 'next/server';
import { deleteSessionCookie } from '@/lib/auth';

export async function POST() {
  await deleteSessionCookie();
  return NextResponse.json({ success: true, redirect: '/login' });
}

export async function GET() {
  await deleteSessionCookie();
  return NextResponse.redirect(new URL('/login', process.env.SITE_URL || 'https://cet-automacao.vercel.app'));
}
