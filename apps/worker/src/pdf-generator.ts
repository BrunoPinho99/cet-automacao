import puppeteer from 'puppeteer';
import { prisma } from '@cet/db';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const PDFS_DIR = path.join(__dirname, '..', '..', '..', '.pdfs');

export async function gerarPdfParaPedido(pedidoId: string): Promise<void> {
  // Garantir diretório local
  await fs.mkdir(PDFS_DIR, { recursive: true });

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      lead: {
        include: {
          empresa: true,
          fichas: {
            orderBy: { criado_em: 'desc' },
            take: 1,
            include: { score_sst: true, rota: true }
          }
        }
      }
    }
  });

  if (!pedido) {
    throw new Error(`Pedido ${pedidoId} não encontrado.`);
  }

  const lead = pedido.lead;
  const empresa = lead.empresa;
  const ficha = lead.fichas[0];

  if (!ficha) {
    throw new Error(`Nenhuma ficha encontrada para o lead ${lead.id}.`);
  }

  // Gera o HTML do relatório
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório CET Automação - ${empresa?.razao_social || 'Desconhecida'}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; color: #333; }
        h1 { color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
        .section { margin-top: 30px; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Relatório Diagnóstico SST</h1>
      <div class="section">
        <p><span class="label">Empresa:</span> ${empresa?.razao_social || empresa?.nome_fantasia}</p>
        <p><span class="label">CNPJ:</span> ${empresa?.cnpj}</p>
        <p><span class="label">Rota Classificada:</span> ${ficha.rota?.rota || 'Não definida'}</p>
      </div>
      <div class="section">
        <h2>Resultado Score SST</h2>
        <p><span class="label">Total:</span> ${ficha.score_sst?.total || 0}/100</p>
        <p><span class="label">Classificação:</span> ${ficha.score_sst?.classificacao || 'N/A'}</p>
      </div>
      <div class="section">
        <p>Gerado automaticamente via Worker Puppeteer.</p>
        <p>Data: ${new Date().toISOString()}</p>
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
  
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  // 1. Gerar Hash
  const hashConteudo = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

  // 2. Salvar localmente
  const arquivoPdfKey = `relatorio-${pedidoId}-${Date.now()}.pdf`;
  const filePath = path.join(PDFS_DIR, arquivoPdfKey);
  await fs.writeFile(filePath, pdfBuffer);

  // 3. Upsert Idempotente no Prisma
  await prisma.relatorio.upsert({
    where: { pedido_id: pedidoId },
    update: {
      arquivo_pdf_key: arquivoPdfKey,
      hash_conteudo: hashConteudo,
      gerado_em: new Date(),
    },
    create: {
      pedido_id: pedidoId,
      tipo: 'diagnostico_completo',
      arquivo_pdf_key: arquivoPdfKey,
      hash_conteudo: hashConteudo,
    },
  });

  console.log(`[PDF] Relatório do pedido ${pedidoId} salvo como ${arquivoPdfKey}`);
}
