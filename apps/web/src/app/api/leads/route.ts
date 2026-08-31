import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validarCNPJ, somenteDigitos, normalizarTelefone, gerarProtocolo } from '@/lib/validacoes';

/**
 * POST /api/leads
 * Cria um novo lead a partir do primeiro contato (WhatsApp, Instagram ou formulário).
 * Deduplicação obrigatória por CNPJ e telefone.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telefone, nome, cnpj, canal, campanha, palavra_chave, primeira_intencao } = body;

    // --- Validações ---
    if (!telefone || !nome) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: telefone, nome' },
        { status: 400 },
      );
    }

    const telefoneNormalizado = normalizarTelefone(telefone);

    // CNPJ é opcional neste ponto (pode chegar via WhatsApp sem CNPJ)
    let cnpjNormalizado: string | null = null;
    if (cnpj) {
      cnpjNormalizado = somenteDigitos(cnpj);
      if (!validarCNPJ(cnpjNormalizado)) {
        return NextResponse.json(
          { erro: 'CNPJ inválido. Verifique os dígitos.' },
          { status: 422 },
        );
      }
    }

    // --- Deduplicação de contato por telefone ---
    let contato = await prisma.contato.findUnique({
      where: { telefone_e164: telefoneNormalizado },
      include: { empresa: true },
    });

    let empresa = contato?.empresa ?? null;

    // Se tem CNPJ, buscar ou criar empresa
    if (cnpjNormalizado) {
      const empresaExistente = await prisma.empresa.findUnique({
        where: { cnpj: cnpjNormalizado },
      });

      if (empresaExistente) {
        empresa = empresaExistente;
      } else {
        empresa = await prisma.empresa.create({
          data: {
            cnpj: cnpjNormalizado,
          },
        });
      }
    }

    // Criar ou atualizar contato
    if (!contato) {
      contato = await prisma.contato.create({
        data: {
          nome,
          telefone_e164: telefoneNormalizado,
          empresa_id: empresa?.id ?? null,
          canal_preferido: canal || 'whatsapp',
        },
        include: { empresa: true },
      });
    } else if (empresa && !contato.empresa_id) {
      // Vincular contato existente à empresa recém-descoberta
      contato = await prisma.contato.update({
        where: { id: contato.id },
        data: { empresa_id: empresa.id },
        include: { empresa: true },
      });
    }

    // --- Criar lead com protocolo único ---
    const protocolo = gerarProtocolo();

    const lead = await prisma.lead.create({
      data: {
        contato_id: contato.id,
        empresa_id: empresa?.id ?? null,
        canal: canal || 'whatsapp',
        campanha: campanha ?? null,
        palavra_chave: palavra_chave ?? null,
        primeira_intencao: primeira_intencao ?? null,
        protocolo,
      },
    });

    return NextResponse.json(
      {
        lead_id: lead.id,
        protocolo: lead.protocolo,
        contato_id: contato.id,
        empresa_id: empresa?.id ?? null,
        mensagem: `Lead criado com sucesso. Protocolo: ${lead.protocolo}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/leads]', error);

    // Tratar erro de CNPJ duplicado (unique constraint)
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { erro: 'Empresa com este CNPJ já está cadastrada.' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { erro: 'Erro interno ao criar lead.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/leads?protocolo=CET-2026-000123
 * Busca um lead pelo protocolo legível.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const protocolo = searchParams.get('protocolo');

    if (!protocolo) {
      return NextResponse.json(
        { erro: 'Parâmetro obrigatório: protocolo' },
        { status: 400 },
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { protocolo },
      include: {
        contato: true,
        empresa: true,
        fichas: {
          orderBy: { criado_em: 'desc' },
          take: 1,
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { erro: 'Lead não encontrado.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      lead_id: lead.id,
      protocolo: lead.protocolo,
      canal: lead.canal,
      contato: {
        nome: lead.contato.nome,
        telefone: lead.contato.telefone_e164,
      },
      empresa: lead.empresa
        ? { cnpj: lead.empresa.cnpj, razao_social: lead.empresa.razao_social }
        : null,
      ficha_ativa: lead.fichas[0]
        ? {
            ficha_id: lead.fichas[0].id,
            token_retomada: lead.fichas[0].token_retomada,
            bloco_atual: lead.fichas[0].bloco_atual,
            status: lead.fichas[0].status,
          }
        : null,
    });
  } catch (error) {
    console.error('[GET /api/leads]', error);
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 });
  }
}
