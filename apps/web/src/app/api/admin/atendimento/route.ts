import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { getSession } from '@/lib/auth';
import { enviarMensagem } from '@/lib/mensageria';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const leads = await prisma.lead.findMany({
      where: {
        mensagens: {
          some: {}
        }
      },
      include: {
        contato: true,
        empresa: true,
        mensagens: {
          orderBy: { criado_em: 'asc' }
        }
      },
      orderBy: {
        atualizado_em: 'desc'
      }
    });

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('[GET /api/admin/atendimento] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar conversas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leadId, conteudo, template } = body;

    if (!leadId || !conteudo?.trim()) {
      return NextResponse.json({ error: 'leadId e conteudo são obrigatórios' }, { status: 400 });
    }

    const chave_idempotencia = randomUUID();
    const msg = await enviarMensagem({
      lead_id: leadId,
      conteudo: conteudo.trim(),
      chave_idempotencia,
      template: template || undefined,
      ignorarJanela24h: true,
    });

    return NextResponse.json({ success: true, mensagem: msg });
  } catch (error: any) {
    console.error('[POST /api/admin/atendimento] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro ao enviar mensagem' }, { status: 500 });
  }
}
