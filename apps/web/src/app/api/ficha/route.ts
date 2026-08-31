import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BLOCOS_FICHA, TOTAL_BLOCOS } from '@/lib/blocos-ficha';
import { calcularScoreComercial, classificarRota, calcularScoreSST } from '@cet/core';

/**
 * POST /api/ficha
 * Cria uma nova ficha para um lead existente.
 * Retorna o token_retomada para o cliente continuar de onde parou.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id } = body;

    if (!lead_id) {
      return NextResponse.json(
        { erro: 'Campo obrigatório: lead_id' },
        { status: 400 },
      );
    }

    // Verificar se o lead existe
    const lead = await prisma.lead.findUnique({
      where: { id: lead_id },
      include: { fichas: { where: { status: { not: 'concluida' } }, take: 1 } },
    });

    if (!lead) {
      return NextResponse.json(
        { erro: 'Lead não encontrado.' },
        { status: 404 },
      );
    }

    // Se já existe ficha aberta, retornar a mesma (idempotência)
    if (lead.fichas.length > 0) {
      const fichaExistente = lead.fichas[0];
      return NextResponse.json({
        ficha_id: fichaExistente.id,
        token_retomada: fichaExistente.token_retomada,
        bloco_atual: fichaExistente.bloco_atual,
        total_blocos: TOTAL_BLOCOS,
        status: fichaExistente.status,
        mensagem: 'Ficha existente retomada.',
      });
    }

    // Criar nova ficha
    const ficha = await prisma.ficha.create({
      data: {
        lead_id,
        status: 'iniciada',
        bloco_atual: 1,
        respostas: {},
      },
    });

    return NextResponse.json(
      {
        ficha_id: ficha.id,
        token_retomada: ficha.token_retomada,
        bloco_atual: ficha.bloco_atual,
        total_blocos: TOTAL_BLOCOS,
        status: ficha.status,
        mensagem: 'Ficha criada com sucesso.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/ficha]', error);
    return NextResponse.json(
      { erro: 'Erro interno ao criar ficha.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ficha?token=<token_retomada>
 * Retoma a ficha de onde o cliente parou.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { erro: 'Parâmetro obrigatório: token' },
        { status: 400 },
      );
    }

    const ficha = await prisma.ficha.findUnique({
      where: { token_retomada: token },
      include: {
        lead: {
          include: {
            contato: {
              include: { consentimentos: true }
            },
            empresa: true,
          },
        },
      },
    });

    if (!ficha) {
      return NextResponse.json(
        { erro: 'Ficha não encontrada. Token inválido ou expirado.' },
        { status: 404 },
      );
    }

    // Montar estrutura de retorno com o bloco atual
    const blocoAtual = BLOCOS_FICHA.find(b => b.numero === ficha.bloco_atual);
    const precisaConsentimento = ficha.lead.contato.consentimentos.length === 0;

    return NextResponse.json({
      ficha_id: ficha.id,
      status: ficha.status,
      bloco_atual: ficha.bloco_atual,
      total_blocos: TOTAL_BLOCOS,
      respostas: ficha.respostas,
      bloco: blocoAtual ?? null,
      precisa_consentimento: precisaConsentimento,
      lead: {
        protocolo: ficha.lead.protocolo,
        contato: ficha.lead.contato.nome,
        contato_id: ficha.lead.contato.id,
      },
    });
  } catch (error) {
    console.error('[GET /api/ficha]', error);
    return NextResponse.json(
      { erro: 'Erro interno ao buscar ficha.' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/ficha
 * Salva as respostas de um bloco e avança para o próximo.
 * O motor de regras dispara quando o último bloco é concluído.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, bloco, respostas } = body;

    if (!token || !bloco || !respostas) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: token, bloco, respostas' },
        { status: 400 },
      );
    }

    // Buscar ficha pelo token
    const ficha = await prisma.ficha.findUnique({
      where: { token_retomada: token },
      include: { lead: { include: { empresa: true } } },
    });

    if (!ficha) {
      return NextResponse.json(
        { erro: 'Ficha não encontrada.' },
        { status: 404 },
      );
    }

    if (ficha.status === 'concluida') {
      return NextResponse.json(
        { erro: 'Esta ficha já foi concluída.' },
        { status: 409 },
      );
    }

    // Validar que o bloco é o esperado
    if (bloco !== ficha.bloco_atual) {
      return NextResponse.json(
        { erro: `Bloco esperado: ${ficha.bloco_atual}. Recebido: ${bloco}.` },
        { status: 422 },
      );
    }

    // Merge das respostas (deep merge por bloco)
    const respostasAtuais = (ficha.respostas as Record<string, unknown>) || {};
    const respostasNovas = {
      ...respostasAtuais,
      [`bloco_${bloco}`]: respostas,
    };

    const ehUltimoBloco = bloco >= TOTAL_BLOCOS;
    const proximoBloco = ehUltimoBloco ? bloco : bloco + 1;
    const novoStatus = ehUltimoBloco ? 'concluida' : 'em_andamento';

    // Atualizar ficha
    const fichaAtualizada = await prisma.ficha.update({
      where: { id: ficha.id },
      data: {
        respostas: respostasNovas,
        bloco_atual: proximoBloco,
        status: novoStatus,
        concluida_em: ehUltimoBloco ? new Date() : null,
      },
    });

    // Se o bloco 1 contém CNPJ e dados da empresa, atualizar a empresa
    if (bloco === 1 && respostas.cnpj && ficha.lead.empresa) {
      await prisma.empresa.update({
        where: { id: ficha.lead.empresa.id },
        data: {
          razao_social: respostas.razao_social ?? undefined,
          nome_fantasia: respostas.nome_fantasia ?? undefined,
          atividade_real: respostas.atividade_real ?? undefined,
          cidade: respostas.cidade ?? undefined,
          uf: respostas.uf ?? undefined,
        },
      });
    }

    // Se o bloco 2 contém dados de porte, atualizar empresa
    if (bloco === 2 && ficha.lead.empresa) {
      await prisma.empresa.update({
        where: { id: ficha.lead.empresa.id },
        data: {
          trabalhadores_proprios: parseInt(respostas.trabalhadores_proprios) || 0,
          trabalhadores_terceiros: parseInt(respostas.trabalhadores_terceiros) || 0,
          unidades: parseInt(respostas.unidades) || 1,
          estados_atendidos: respostas.estados_atendidos ?? [],
          grau_risco: respostas.grau_risco && respostas.grau_risco !== 'Não sei'
            ? parseInt(respostas.grau_risco)
            : undefined,
        },
      });
    }

    // Se concluiu, disparar cálculo de scores (assíncrono)
    if (ehUltimoBloco) {
      // TODO: Disparar motor de regras via BullMQ ou domain event
      // Por enquanto, calcular de forma síncrona
      await calcularScoresSeFinalizou(ficha.id, respostasNovas, ficha.lead.empresa);
    }

    // Retornar próximo bloco
    const proximoBlocoInfo = BLOCOS_FICHA.find(b => b.numero === proximoBloco);

    return NextResponse.json({
      ficha_id: fichaAtualizada.id,
      status: novoStatus,
      bloco_atual: proximoBloco,
      total_blocos: TOTAL_BLOCOS,
      bloco: ehUltimoBloco ? null : proximoBlocoInfo,
      concluida: ehUltimoBloco,
      mensagem: ehUltimoBloco
        ? 'Ficha concluída! Seu diagnóstico está sendo processado.'
        : `Bloco ${bloco} salvo. Avançando para o bloco ${proximoBloco}.`,
    });
  } catch (error) {
    console.error('[PATCH /api/ficha]', error);
    return NextResponse.json(
      { erro: 'Erro interno ao atualizar ficha.' },
      { status: 500 },
    );
  }
}

/**
 * Calcula os scores comercial e SST quando a ficha é concluída.
 * Em produção, isso seria feito via fila (BullMQ).
 */
async function calcularScoresSeFinalizou(
  fichaId: string,
  respostas: Record<string, unknown>,
  empresa: { trabalhadores_proprios: number; trabalhadores_terceiros: number; unidades: number; estados_atendidos: string[]; grau_risco: number | null; cliente_atual: boolean; ploomes_id: string | null } | null,
) {
  try {
    // Motor de regras importado estaticamente no topo do arquivo

    if (!empresa) return;

    const bloco2 = respostas.bloco_2 as Record<string, unknown> | undefined;
    const bloco3 = respostas.bloco_3 as Record<string, unknown> | undefined;
    const bloco4 = respostas.bloco_4 as Record<string, unknown> | undefined;

    // Montar input para o motor de regras
    const empresaInput = {
      trabalhadores_proprios: empresa.trabalhadores_proprios,
      trabalhadores_terceiros: empresa.trabalhadores_terceiros,
      unidades: empresa.unidades,
      estados_atendidos: empresa.estados_atendidos,
      grau_risco: empresa.grau_risco ?? undefined,
      cliente_atual: empresa.cliente_atual,
      ploomes_id: empresa.ploomes_id ?? undefined,
    };

    const fichaInput = {
      tem_acidente_recente: (bloco4 as Record<string, unknown>)?.tem_acidente_recente === true,
      tem_fiscalizacao: (bloco4 as Record<string, unknown>)?.tem_fiscalizacao === true,
      prazo_urgente: (bloco4 as Record<string, unknown>)?.prazo_urgente === true,
      objetivo_principal: (bloco4 as Record<string, unknown>)?.objetivo_principal as string | undefined,
    };

    // Score Comercial
    const scoreComercialResult = calcularScoreComercial(empresaInput, fichaInput);
    await prisma.scoreComercial.create({
      data: {
        ficha_id: fichaId,
        porte_unidades: scoreComercialResult.porte_unidades,
        complexidade: scoreComercialResult.complexidade,
        urgencia: scoreComercialResult.urgencia,
        potencial: scoreComercialResult.potencial,
        qualidade_dados: scoreComercialResult.qualidade_dados,
        total: scoreComercialResult.total,
        faixa: scoreComercialResult.faixa,
        versao_regras: 'v1.0.0',
      },
    });

    // Score SST
    const scoreSstResult = calcularScoreSST(empresaInput, fichaInput);
    await prisma.scoreSst.create({
      data: {
        ficha_id: fichaId,
        total: scoreSstResult.total,
        classificacao: scoreSstResult.classificacao,
        por_eixo: scoreSstResult.por_eixo as unknown as import('@prisma/client').Prisma.InputJsonValue,
        itens_nao_aplicaveis: scoreSstResult.itens_nao_aplicaveis,
        versao_regras: scoreSstResult.versao_regras,
      }
    });

    // Classificação de Rota
    const rotaResult = classificarRota(empresaInput, fichaInput);
    await prisma.rota.create({
      data: {
        ficha_id: fichaId,
        rota: rotaResult.rota === 'cliente_atual' ? 'X' : rotaResult.rota,
        rota_completa: rotaResult.rota,
        gatilho_critico: rotaResult.gatilhoCritico,
        motivos: rotaResult.motivos,
        sla_minutos: rotaResult.slaMinutos,
      },
    });

    console.log(`[Scores] Ficha ${fichaId}: Rota=${rotaResult.rota}, ScoreComercial=${scoreComercialResult.total}`);
  } catch (error) {
    console.error(`[Scores] Erro ao calcular scores para ficha ${fichaId}:`, error);
    // Em produção: registrar DomainEvent com status=erro para reprocessamento
  }
}
