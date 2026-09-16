import puppeteer from 'puppeteer';
import { prisma } from '@cet/db';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const PDFS_DIR = path.join(__dirname, '..', '..', '..', '.pdfs');

export async function gerarPdfParaFicha(fichaId: string): Promise<void> {
  // Garantir diretório local
  await fs.mkdir(PDFS_DIR, { recursive: true });

  const ficha = await prisma.ficha.findUnique({
    where: { id: fichaId },
    include: {
      lead: {
        include: { empresa: true }
      },
      score_sst: true,
      score_comercial: true,
      rota: true
    }
  });

  if (!ficha) {
    throw new Error(`Ficha ${fichaId} não encontrada.`);
  }

  const empresa = ficha.lead.empresa;

  // Gera o HTML do relatório
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório CET Automação - ${empresa?.razao_social || 'Desconhecida'}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #334155; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #0f172a; margin-bottom: 5px; }
        .header p { color: #64748b; font-size: 14px; margin: 0; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .card h2 { color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
        .label { font-weight: bold; color: #475569; }
        .value { color: #0f172a; font-weight: 500; }
        .score-box { background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 16px; text-align: center; margin-top: 16px; }
        .score-box h3 { margin: 0; color: #166534; font-size: 24px; }
        .score-box p { margin: 4px 0 0; color: #15803d; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Diagnóstico SST — CET</h1>
        <p>Relatório automatizado de inteligência e conformidade</p>
      </div>

      <div class="card">
        <h2>Dados da Empresa</h2>
        <div class="row">
          <span class="label">Razão Social:</span>
          <span class="value">${empresa?.razao_social || empresa?.nome_fantasia}</span>
        </div>
        <div class="row">
          <span class="label">CNPJ:</span>
          <span class="value">${empresa?.cnpj}</span>
        </div>
        <div class="row">
          <span class="label">Rota Estratégica:</span>
          <span class="value">${ficha.rota?.rota || 'Não definida'}</span>
        </div>
      </div>

      <div class="card">
        <h2>Resultados do Diagnóstico</h2>
        <div class="row">
          <span class="label">Classificação SST:</span>
          <span class="value">${ficha.score_sst?.classificacao || 'N/A'}</span>
        </div>
        
        <div class="score-box">
          <h3>Score SST: ${ficha.score_sst?.total || 0} / 100</h3>
          <p>Potencial Comercial Avaliado: ${ficha.score_comercial?.total || 0} pontos</p>
        </div>
      </div>

      <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px;">
        <p>Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
        <p>CET Clínica Especializada no Trabalho © ${new Date().getFullYear()}</p>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html);
  
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  // 1. Gerar Hash
  const hashConteudo = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // 2. Salvar localmente
  const arquivoPdfKey = `relatorio-ficha-${fichaId}-${Date.now()}.pdf`;
  const filePath = path.join(PDFS_DIR, arquivoPdfKey);
  await fs.writeFile(filePath, pdfBuffer);

  // 3. Upsert Idempotente no Prisma
  await prisma.relatorio.upsert({
    where: { ficha_id: fichaId },
    update: {
      arquivo_pdf_key: arquivoPdfKey,
      hash_conteudo: hashConteudo,
      gerado_em: new Date(),
    },
    create: {
      ficha_id: fichaId,
      tipo: 'diagnostico_completo',
      arquivo_pdf_key: arquivoPdfKey,
      hash_conteudo: hashConteudo,
    },
  });

  console.log(`[PDF] Relatório da ficha ${fichaId} salvo como ${arquivoPdfKey}`);
}
