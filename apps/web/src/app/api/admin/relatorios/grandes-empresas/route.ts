import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';
import { getSession } from '@/lib/auth';
import { podeAcessarRota } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const url = new URL(request.url);
    
    // Auth validation
    if (!session || !podeAcessarRota(url.pathname, session.role)) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
    }

    // Busca empresas com mais de 100 trabalhadores (próprios + terceiros) cadastradas nas últimas 24h
    const dataLimite = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const empresas = await prisma.empresa.findMany({
      where: {
        criado_em: { gte: dataLimite },
      },
      include: {
        leads: {
          include: { contato: true },
          take: 1,
        }
      },
      orderBy: { criado_em: 'desc' }
    });

    const grandesEmpresas = empresas.filter(e => 
      (e.trabalhadores_proprios + e.trabalhadores_terceiros) > 100
    );

    return NextResponse.json({ 
      dataLimite,
      total: grandesEmpresas.length,
      empresas: grandesEmpresas.map(e => ({
        id: e.id,
        cnpj: e.cnpj,
        razao_social: e.razao_social,
        trabalhadores_total: e.trabalhadores_proprios + e.trabalhadores_terceiros,
        contato: e.leads[0]?.contato?.nome || 'N/A',
        telefone: e.leads[0]?.contato?.telefone_e164 || 'N/A',
      }))
    });
  } catch (error) {
    console.error('[GET /api/admin/relatorios/grandes-empresas]', error);
    return NextResponse.json({ erro: 'Erro interno ao gerar relatório' }, { status: 500 });
  }
}
