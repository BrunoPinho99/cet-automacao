import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const rota = searchParams.get('rota') || '';
    const status = searchParams.get('status') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search.trim()) {
      const termo = search.trim();
      const termoDigitos = termo.replace(/\D/g, '');

      where.OR = [
        { protocolo: { contains: termo, mode: 'insensitive' } },
        { empresa: { razao_social: { contains: termo, mode: 'insensitive' } } },
        { empresa: { nome_fantasia: { contains: termo, mode: 'insensitive' } } },
        { contato: { nome: { contains: termo, mode: 'insensitive' } } },
      ];

      if (termoDigitos) {
        where.OR.push({ empresa: { cnpj: { contains: termoDigitos } } });
        where.OR.push({ contato: { telefone_e164: { contains: termoDigitos } } });
      }
    }

    if (rota && rota !== 'todas') {
      where.fichas = {
        some: {
          rota: {
            rota: rota,
          },
        },
      };
    }

    if (status && status !== 'todos') {
      where.pedidos = {
        some: {
          status: status,
        },
      };
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { criado_em: 'desc' },
      take: 100,
      include: {
        empresa: true,
        contato: true,
        pedidos: {
          orderBy: { criado_em: 'desc' },
          take: 1,
        },
        fichas: {
          orderBy: { criado_em: 'desc' },
          take: 1,
          include: {
            rota: true,
            score_sst: true,
            score_comercial: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('Erro ao listar leads:', error);
    return NextResponse.json({ error: 'Erro ao listar leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      razao_social,
      nome_fantasia,
      cnpj,
      contato_nome,
      contato_telefone,
      contato_email,
      cidade,
      uf,
      trabalhadores_proprios,
      trabalhadores_terceiros,
      unidades,
      grau_risco,
      rota,
      canal,
      valor_estimado,
      status_pagamento,
    } = body;

    if (!cnpj || !contato_nome || !contato_telefone) {
      return NextResponse.json(
        { error: 'CNPJ, nome do contato e telefone são obrigatórios.' },
        { status: 400 }
      );
    }

    const cnpjLimpo = String(cnpj).replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return NextResponse.json(
        { error: 'CNPJ deve conter 14 dígitos.' },
        { status: 400 }
      );
    }

    // 1. Criar ou atualizar empresa
    const empresa = await prisma.empresa.upsert({
      where: { cnpj: cnpjLimpo },
      update: {
        razao_social: razao_social || undefined,
        nome_fantasia: nome_fantasia || undefined,
        cidade: cidade || undefined,
        uf: uf || undefined,
        trabalhadores_proprios: Number(trabalhadores_proprios) || 0,
        trabalhadores_terceiros: Number(trabalhadores_terceiros) || 0,
        unidades: Number(unidades) || 1,
        grau_risco: Number(grau_risco) || 1,
      },
      create: {
        cnpj: cnpjLimpo,
        razao_social: razao_social || 'Empresa Cadastrada',
        nome_fantasia: nome_fantasia || razao_social || 'Nova Empresa',
        cidade: cidade || 'São Paulo',
        uf: uf || 'SP',
        trabalhadores_proprios: Number(trabalhadores_proprios) || 0,
        trabalhadores_terceiros: Number(trabalhadores_terceiros) || 0,
        unidades: Number(unidades) || 1,
        grau_risco: Number(grau_risco) || 1,
      },
    });

    // 2. Contato
    const rawTel = String(contato_telefone).replace(/\D/g, '');
    const telFormatado = rawTel.startsWith('55') ? `+${rawTel}` : `+55${rawTel}`;

    const contato = await prisma.contato.upsert({
      where: { telefone_e164: telFormatado },
      update: {
        nome: contato_nome,
        email: contato_email || undefined,
        empresa_id: empresa.id,
      },
      create: {
        empresa_id: empresa.id,
        nome: contato_nome,
        telefone_e164: telFormatado,
        email: contato_email || null,
        canal_preferido: canal || 'whatsapp',
      },
    });

    // 3. Lead
    const countTotal = await prisma.lead.count();
    const protocolo = `CET-2026-${String(countTotal + 1001).padStart(6, '0')}`;
    const rotaFinal = rota || (Number(trabalhadores_proprios) > 100 ? 'A' : (Number(trabalhadores_proprios) >= 20 ? 'B' : 'C'));

    const lead = await prisma.lead.create({
      data: {
        empresa_id: empresa.id,
        contato_id: contato.id,
        canal: canal || 'comercial',
        protocolo,
        primeira_intencao: `Cadastro via painel para ${nome_fantasia || razao_social}`,
        atendente_id: session.userId,
      },
    });

    // 4. Ficha & Rota
    const ficha = await prisma.ficha.create({
      data: {
        lead_id: lead.id,
        status: 'concluida',
        bloco_atual: 4,
        concluida_em: new Date(),
        respostas: {
          cadastrado_por: session.email,
        },
      },
    });

    await prisma.rota.create({
      data: {
        ficha_id: ficha.id,
        rota: rotaFinal,
        rota_completa: rotaFinal,
        sla_minutos: rotaFinal === 'A' ? 10 : (rotaFinal === 'B' ? 120 : 999),
        motivos: ['Definido via Painel Administrativo CET'],
        responsavel_id: session.userId,
      },
    });

    // 5. Score SST & Comercial padrão
    await prisma.scoreSST.create({
      data: {
        ficha_id: ficha.id,
        total: rotaFinal === 'A' ? 85 : 70,
        classificacao: rotaFinal === 'A' ? 'regular' : 'atencao',
        por_eixo: {
          pgr_gro: { status: 'conforme', nota: 80 },
          pcmso_aso: { status: 'conforme', nota: 70 },
        },
        versao_regras: 'v1.0',
      },
    });

    await prisma.scoreComercial.create({
      data: {
        ficha_id: ficha.id,
        total: rotaFinal === 'A' ? 85 : 55,
        faixa: rotaFinal === 'A' ? 'alta' : 'media',
        versao_regras: 'v1.0',
      },
    });

    // 6. Pedido com status especificado ou pendente
    const stPedido = status_pagamento || 'pendente';
    await prisma.pedido.create({
      data: {
        lead_id: lead.id,
        produto: 'essencial',
        valor_centavos: valor_estimado ? Math.round(Number(valor_estimado) * 100) : 150000,
        status: stPedido,
        idempotency_key: `lead-pedido-${lead.id}-${Date.now()}`,
        pago_em: stPedido === 'pago' ? new Date() : null,
      },
    });

    // 7. Negócio se houver valor
    if (valor_estimado) {
      await prisma.negocio.create({
        data: {
          empresa_id: empresa.id,
          etapa_funil: stPedido === 'pago' ? 'Fechado Ganho' : 'Qualificação Comercial',
          valor_estimado: Math.round(Number(valor_estimado) * 100),
          vendedor_id: session.userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      protocolo,
      message: 'Lead cadastrado com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao criar lead:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar lead e empresa' }, { status: 500 });
  }
}
