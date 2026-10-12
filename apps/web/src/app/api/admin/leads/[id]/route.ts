import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { getSession } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        empresa: true,
        contato: true,
        pedidos: {
          orderBy: { criado_em: 'desc' },
        },
        fichas: {
          orderBy: { criado_em: 'desc' },
          include: {
            rota: true,
            score_sst: true,
            score_comercial: true,
            relatorio: true,
          },
        },
        mensagens: {
          orderBy: { criado_em: 'desc' },
          take: 20,
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Erro ao buscar lead:', error);
    return NextResponse.json({ error: 'Erro ao buscar detalhes do lead' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        empresa: true,
        contato: true,
        pedidos: { orderBy: { criado_em: 'desc' }, take: 1 },
        fichas: { orderBy: { criado_em: 'desc' }, take: 1, include: { rota: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const {
      razao_social,
      nome_fantasia,
      cnpj,
      cidade,
      uf,
      trabalhadores_proprios,
      trabalhadores_terceiros,
      unidades,
      grau_risco,
      contato_nome,
      contato_telefone,
      contato_email,
      rota,
      status_pagamento,
      valor_estimado,
      canal,
    } = body;

    // 1. Atualizar Empresa se informada
    if (lead.empresa_id) {
      const empresaData: Record<string, unknown> = {};
      if (razao_social !== undefined) empresaData.razao_social = razao_social;
      if (nome_fantasia !== undefined) empresaData.nome_fantasia = nome_fantasia;
      if (cnpj !== undefined) empresaData.cnpj = String(cnpj).replace(/\D/g, '');
      if (cidade !== undefined) empresaData.cidade = cidade;
      if (uf !== undefined) empresaData.uf = uf;
      if (trabalhadores_proprios !== undefined) empresaData.trabalhadores_proprios = Number(trabalhadores_proprios) || 0;
      if (trabalhadores_terceiros !== undefined) empresaData.trabalhadores_terceiros = Number(trabalhadores_terceiros) || 0;
      if (unidades !== undefined) empresaData.unidades = Number(unidades) || 1;
      if (grau_risco !== undefined) empresaData.grau_risco = Number(grau_risco) || 1;

      if (Object.keys(empresaData).length > 0) {
        await prisma.empresa.update({
          where: { id: lead.empresa_id },
          data: empresaData,
        });
      }
    }

    // 2. Atualizar Contato se informado
    if (lead.contato_id) {
      const contatoData: Record<string, unknown> = {};
      if (contato_nome !== undefined) contatoData.nome = contato_nome;
      if (contato_email !== undefined) contatoData.email = contato_email || null;
      if (contato_telefone !== undefined) {
        const rawTel = String(contato_telefone).replace(/\D/g, '');
        contatoData.telefone_e164 = rawTel.startsWith('55') ? `+${rawTel}` : `+55${rawTel}`;
      }

      if (Object.keys(contatoData).length > 0) {
        await prisma.contato.update({
          where: { id: lead.contato_id },
          data: contatoData,
        });
      }
    }

    // 3. Atualizar Rota se informada
    if (rota) {
      const ficha = lead.fichas[0];
      if (ficha) {
        const sla = rota === 'A' ? 10 : (rota === 'B' ? 120 : 999);
        await prisma.rota.upsert({
          where: { ficha_id: ficha.id },
          update: {
            rota,
            rota_completa: rota,
            sla_minutos: sla,
            motivos: ['Atualizado manualmente via Painel Administrativo'],
          },
          create: {
            ficha_id: ficha.id,
            rota,
            rota_completa: rota,
            sla_minutos: sla,
            motivos: ['Definido manualmente via Painel Administrativo'],
            responsavel_id: session.userId,
          },
        });
      }
    }

    // 4. Atualizar Pedido / Status Pagamento se informado
    if (status_pagamento) {
      const pedido = lead.pedidos[0];
      const isPago = status_pagamento.toLowerCase() === 'pago' || status_pagamento.toLowerCase() === 'confirmado';
      if (pedido) {
        await prisma.pedido.update({
          where: { id: pedido.id },
          data: {
            status: isPago ? 'pago' : status_pagamento,
            pago_em: isPago ? new Date() : null,
            valor_centavos: valor_estimado ? Math.round(Number(valor_estimado) * 100) : pedido.valor_centavos,
          },
        });
      } else {
        await prisma.pedido.create({
          data: {
            lead_id: lead.id,
            produto: 'essencial',
            valor_centavos: valor_estimado ? Math.round(Number(valor_estimado) * 100) : 150000,
            status: isPago ? 'pago' : status_pagamento,
            idempotency_key: `lead-pedido-${lead.id}-${Date.now()}`,
            pago_em: isPago ? new Date() : null,
          },
        });
      }
    }

    // 5. Atualizar Canal do Lead se informado
    if (canal) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { canal },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead atualizado com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados do lead' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        fichas: { select: { id: true } },
        pedidos: { select: { id: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const fichaIds = lead.fichas.map((f) => f.id);
    const pedidoIds = lead.pedidos.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      // 1. Deletar dependências das fichas
      if (fichaIds.length > 0) {
        await tx.documentoDeclarado.deleteMany({ where: { ficha_id: { in: fichaIds } } });
        await tx.scoreComercial.deleteMany({ where: { ficha_id: { in: fichaIds } } });
        await tx.scoreSST.deleteMany({ where: { ficha_id: { in: fichaIds } } });
        await tx.rota.deleteMany({ where: { ficha_id: { in: fichaIds } } });
        await tx.relatorio.deleteMany({ where: { ficha_id: { in: fichaIds } } });
        await tx.arquivo.deleteMany({ where: { ficha_id: { in: fichaIds } } });
        await tx.ficha.deleteMany({ where: { id: { in: fichaIds } } });
      }

      // 2. Deletar pedidos e relatórios associados
      if (pedidoIds.length > 0) {
        await tx.relatorio.deleteMany({ where: { pedido_id: { in: pedidoIds } } });
        await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
      }

      // 3. Deletar mensagens associadas
      await tx.mensagem.deleteMany({ where: { lead_id: id } });

      // 4. Deletar o lead
      await tx.lead.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: 'Lead e registros vinculados excluídos com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao excluir lead:', error);
    return NextResponse.json({ error: 'Erro ao excluir o lead' }, { status: 500 });
  }
}
