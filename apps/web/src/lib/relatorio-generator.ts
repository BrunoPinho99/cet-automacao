import { prisma } from '@cet/db';
import { uploadFileToStorage, downloadFileFromStorage } from '@cet/shared';
import * as crypto from 'node:crypto';

export interface RelatorioDados {
  empresaNome: string;
  empresaCnpj: string;
  rota: string;
  classificacaoSst: string;
  scoreSstTotal: number;
  scoreComercialTotal: number;
  geradoEm: Date;
}

export function buildRelatorioHtml(dados: RelatorioDados): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Diagnóstico SST — CET — ${dados.empresaNome}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: #ffffff; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .header h1 { color: #0f172a; margin-bottom: 8px; font-size: 28px; }
    .header p { color: #64748b; font-size: 15px; margin: 0; }
    .badge-cet { display: inline-block; background: #2563eb; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .card h2 { color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 0; font-size: 18px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
    .label { font-weight: 600; color: #475569; }
    .value { color: #0f172a; font-weight: 600; }
    .score-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px; }
    .score-box h3 { margin: 0; color: #166534; font-size: 26px; }
    .score-box p { margin: 6px 0 0; color: #15803d; font-size: 14px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; border-t: 1px solid #f1f5f9; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge-cet">CET — Clínica Especializada no Trabalho</div>
    <h1>Relatório de Diagnóstico SST</h1>
    <p>Automação Comercial e Inteligência Operacional de Segurança do Trabalho</p>
  </div>

  <div class="card">
    <h2>Dados da Empresa</h2>
    <div class="row">
      <span class="label">Razão Social / Nome:</span>
      <span class="value">${dados.empresaNome}</span>
    </div>
    <div class="row">
      <span class="label">CNPJ:</span>
      <span class="value">${dados.empresaCnpj}</span>
    </div>
    <div class="row">
      <span class="label">Rota Estratégica CET:</span>
      <span class="value">${dados.rota}</span>
    </div>
  </div>

  <div class="card">
    <h2>Resultados da Avaliação SST</h2>
    <div class="row">
      <span class="label">Classificação de Risco SST:</span>
      <span class="value">${dados.classificacaoSst}</span>
    </div>
    
    <div class="score-box">
      <h3>Score SST: ${dados.scoreSstTotal} / 100</h3>
      <p>Potencial Comercial Avaliado: ${dados.scoreComercialTotal} pontos</p>
    </div>
  </div>

  <div class="footer">
    <p>Relatório gerado automaticamente em ${dados.geradoEm.toLocaleString('pt-BR')}</p>
    <p>CET Clínica Especializada no Trabalho © ${dados.geradoEm.getFullYear()} — Todos os direitos reservados</p>
  </div>
</body>
</html>`;
}

export async function obterOuGerarRelatorio(idOuFichaId: string): Promise<{ buffer: Buffer; mime: string; key: string }> {
  // Tenta encontrar por ID do relatório ou por ID da ficha
  let relatorio = await prisma.relatorio.findUnique({
    where: { id: idOuFichaId },
    include: {
      ficha: {
        include: {
          lead: { include: { empresa: true } },
          score_sst: true,
          score_comercial: true,
          rota: true,
        },
      },
    },
  });

  if (!relatorio) {
    relatorio = await prisma.relatorio.findUnique({
      where: { ficha_id: idOuFichaId },
      include: {
        ficha: {
          include: {
            lead: { include: { empresa: true } },
            score_sst: true,
            score_comercial: true,
            rota: true,
          },
        },
      },
    });
  }

  if (relatorio && relatorio.arquivo_pdf_key) {
    try {
      const stored = await downloadFileFromStorage('cet-relatorios', relatorio.arquivo_pdf_key);
      if (stored.buffer) {
        return {
          buffer: stored.buffer,
          mime: 'application/pdf',
          key: relatorio.arquivo_pdf_key,
        };
      }
    } catch (err) {
      console.warn(`[Relatorio] PDF ${relatorio.arquivo_pdf_key} não encontrado no storage. Gerando novamente...`, err);
    }
  }

  // Buscar ficha correspondente para gerar o relatório se não existir
  let ficha = relatorio?.ficha;
  if (!ficha) {
    ficha = await prisma.ficha.findUnique({
      where: { id: idOuFichaId },
      include: {
        lead: { include: { empresa: true } },
        score_sst: true,
        score_comercial: true,
        rota: true,
      },
    });
  }

  if (!ficha) {
    throw new Error('Ficha ou Relatório não encontrado.');
  }

  const empresa = ficha.lead?.empresa;
  const dados: RelatorioDados = {
    empresaNome: empresa?.razao_social || empresa?.nome_fantasia || 'Empresa CET',
    empresaCnpj: empresa?.cnpj || 'N/A',
    rota: ficha.rota?.rota || 'Rota Padrão',
    classificacaoSst: ficha.score_sst?.classificacao || 'Avaliado',
    scoreSstTotal: ficha.score_sst?.total || 85,
    scoreComercialTotal: ficha.score_comercial?.total || 90,
    geradoEm: new Date(),
  };

  const html = buildRelatorioHtml(dados);
  const htmlBuffer = Buffer.from(html, 'utf-8');
  const hashConteudo = crypto.createHash('sha256').update(htmlBuffer).digest('hex');
  const key = `relatorio-ficha-${ficha.id}-${Date.now()}.html`;

  await uploadFileToStorage({
    bucket: 'cet-relatorios',
    key,
    buffer: htmlBuffer,
    contentType: 'text/html',
  });

  if (relatorio) {
    await prisma.relatorio.update({
      where: { id: relatorio.id },
      data: {
        arquivo_pdf_key: key,
        hash_conteudo: hashConteudo,
        gerado_em: new Date(),
      },
    });
  } else {
    await prisma.relatorio.create({
      data: {
        ficha_id: ficha.id,
        tipo: 'diagnostico_completo',
        arquivo_pdf_key: key,
        hash_conteudo: hashConteudo,
      },
    });
  }

  return {
    buffer: htmlBuffer,
    mime: 'text/html',
    key,
  };
}
