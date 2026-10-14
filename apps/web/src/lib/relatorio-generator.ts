import { prisma } from '@cet/db';
import { uploadFileToStorage, downloadFileFromStorage } from '@cet/shared';
import * as crypto from 'node:crypto';
import { infoPorte } from './porte';

export interface RelatorioDados {
  empresaNome: string;
  empresaCnpj: string;
  porteNome: string;
  porteDescricao: string;
  classificacaoSst: string;
  scoreSstTotal: number;
  scoreComercialTotal: number;
  protocolo?: string;
  respostas?: Record<string, string>;
  geradoEm: Date;
}

export function buildRelatorioHtml(dados: RelatorioDados): string {
  const cnpjFormatado = dados.empresaCnpj && dados.empresaCnpj.length === 14
    ? dados.empresaCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : dados.empresaCnpj || 'Não informado';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico SST — CET — ${dados.empresaNome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
      padding: 32px 16px;
    }
    .container {
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0691c8 0%, #0369a1 100%);
      color: #ffffff;
      padding: 32px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-info h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header-info p {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 4px;
    }
    .badge-protocolo {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .content {
      padding: 36px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
      background: #ffffff;
    }
    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-title::before {
      content: "";
      width: 4px;
      height: 16px;
      background: #0691c8;
      border-radius: 2px;
      display: inline-block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
    }
    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .field-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      width: fit-content;
      margin-top: 4px;
    }
    .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .badge-green { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .score-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .score-value {
      font-size: 36px;
      font-weight: 800;
      color: #15803d;
      letter-spacing: -0.03em;
    }
    .score-label {
      font-size: 13px;
      font-weight: 600;
      color: #166534;
      margin-top: 4px;
    }
    .actions-bar {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .btn {
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #0691c8;
      color: #ffffff;
      border: none;
    }
    .btn-primary:hover { background: #0284c7; }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .container { border: none; box-shadow: none; max-width: 100%; }
      .actions-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-info">
        <h1>CET — Diagnóstico SST</h1>
        <p>Segurança e Medicina do Trabalho • Relatório Executivo</p>
      </div>
      ${dados.protocolo ? `<div class="badge-protocolo">Protocolo: ${dados.protocolo}</div>` : ''}
    </div>

    <div class="content">
      <div class="score-banner">
        <div class="score-value">${dados.scoreSstTotal} <span style="font-size: 20px; font-weight: 600; color: #4ade80;">/ 100</span></div>
        <div class="score-label">Classificação SST: ${dados.classificacaoSst}</div>
      </div>

      <div class="card">
        <div class="card-title">Dados da Empresa</div>
        <div class="grid">
          <div class="field">
            <span class="field-label">Empresa / Razão Social</span>
            <span class="field-value">${dados.empresaNome}</span>
          </div>
          <div class="field">
            <span class="field-label">CNPJ</span>
            <span class="field-value">${cnpjFormatado}</span>
          </div>
          <div class="field">
            <span class="field-label">Porte da Empresa</span>
            <span class="badge badge-blue">${dados.porteNome}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Enquadramento Regulatório</div>
        <div class="grid">
          <div class="field">
            <span class="field-label">Diretriz Operacional</span>
            <span class="field-value">${dados.porteDescricao}</span>
          </div>
          <div class="field">
            <span class="field-label">Avaliação Comercial</span>
            <span class="field-value">${dados.scoreComercialTotal} pontos</span>
          </div>
          <div class="field">
            <span class="field-label">Data de Emissão</span>
            <span class="field-value">${dados.geradoEm.toLocaleDateString('pt-BR')} às ${dados.geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      <div class="actions-bar">
        <button onclick="window.print()" class="btn btn-primary">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / Salvar em PDF
        </button>
      </div>
    </div>

    <div class="footer">
      CET Clínica Especializada no Trabalho • Todos os direitos reservados • Documento gerado eletronicamente
    </div>
  </div>
</body>
</html>`;
}

export async function obterOuGerarRelatorio(idOuFichaId: string): Promise<{ buffer: Buffer; mime: string; key: string }> {
  // 1. Tentar encontrar por ID do relatório
  let relatorio = await prisma.relatorio.findUnique({
    where: { id: idOuFichaId },
    include: {
      ficha: {
        include: {
          lead: {
            include: {
              empresa: true,
              pedidos: { orderBy: { criado_em: 'desc' }, take: 1 },
            },
          },
          score_sst: true,
          score_comercial: true,
          rota: true,
        },
      },
    },
  });

  // 2. Tentar encontrar por ID da ficha
  if (!relatorio) {
    relatorio = await prisma.relatorio.findUnique({
      where: { ficha_id: idOuFichaId },
      include: {
        ficha: {
          include: {
            lead: {
              include: {
                empresa: true,
                pedidos: { orderBy: { criado_em: 'desc' }, take: 1 },
              },
            },
            score_sst: true,
            score_comercial: true,
            rota: true,
          },
        },
      },
    });
  }

  // 3. Se já existe arquivo PDF físico armazenado, tentar devolver
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
      console.warn(`[Relatorio] PDF ${relatorio.arquivo_pdf_key} não encontrado no storage. Gerando nova versão HTML...`, err);
    }
  }

  // 4. Buscar ficha correspondente (seja por id da ficha ou id do lead)
  let ficha: any = relatorio?.ficha;
  if (!ficha) {
    ficha = await prisma.ficha.findUnique({
      where: { id: idOuFichaId },
      include: {
        lead: {
          include: {
            empresa: true,
            pedidos: { orderBy: { criado_em: 'desc' }, take: 1 },
          },
        },
        score_sst: true,
        score_comercial: true,
        rota: true,
      },
    });
  }

  // 5. Fallback: procurar ficha pelo lead_id caso o parâmetro passado tenha sido o ID do lead
  if (!ficha) {
    ficha = await prisma.ficha.findFirst({
      where: { lead_id: idOuFichaId },
      orderBy: { criado_em: 'desc' },
      include: {
        lead: {
          include: {
            empresa: true,
            pedidos: { orderBy: { criado_em: 'desc' }, take: 1 },
          },
        },
        score_sst: true,
        score_comercial: true,
        rota: true,
      },
    });
  }

  if (!ficha) {
    throw new Error('Ficha ou Lead correspondente não foi localizado.');
  }

  const empresa = ficha.lead?.empresa;
  const porte = infoPorte(ficha.rota?.rota);

  const dados: RelatorioDados = {
    empresaNome: empresa?.razao_social || empresa?.nome_fantasia || 'Empresa CET',
    empresaCnpj: empresa?.cnpj || 'N/A',
    porteNome: porte.nome,
    porteDescricao: porte.descricao,
    classificacaoSst: ficha.score_sst?.classificacao || 'Conforme Diretrizes Básicas',
    scoreSstTotal: ficha.score_sst?.total || 85,
    scoreComercialTotal: ficha.score_comercial?.total || 90,
    protocolo: ficha.lead?.protocolo,
    respostas: (ficha.respostas as Record<string, string>) || {},
    geradoEm: new Date(),
  };

  const html = buildRelatorioHtml(dados);
  const htmlBuffer = Buffer.from(html, 'utf-8');
  const hashConteudo = crypto.createHash('sha256').update(htmlBuffer).digest('hex');
  const key = `diagnostico-sst-${ficha.id}-${Date.now()}.html`;

  // Enviar para storage sem travar caso o bucket esteja inacessível
  try {
    await uploadFileToStorage({
      bucket: 'cet-relatorios',
      key,
      buffer: htmlBuffer,
      contentType: 'text/html',
    });
  } catch (storageErr) {
    console.warn('[Relatorio] Aviso no envio para storage:', storageErr);
  }

  // 6. Persistência segura no banco de dados (com resolução de pedido_id)
  try {
    let pedidoId = ficha.lead?.pedidos?.[0]?.id;

    // Se o banco exigir pedido_id e não houver nenhum, cria um pedido preliminar de triagem
    if (!pedidoId && ficha.lead_id) {
      try {
        const pedidoTriagem = await prisma.pedido.create({
          data: {
            lead_id: ficha.lead_id,
            produto: 'triagem',
            valor_centavos: 0,
            status: 'concluido',
            idempotency_key: `triagem-${ficha.id}-${Date.now()}`,
          },
        });
        pedidoId = pedidoTriagem.id;
      } catch (errPedido) {
        console.warn('[Relatorio] Aviso ao criar pedido cortesia de triagem:', errPedido);
      }
    }

    if (relatorio) {
      await prisma.relatorio.update({
        where: { id: relatorio.id },
        data: {
          arquivo_pdf_key: key,
          hash_conteudo: hashConteudo,
          gerado_em: new Date(),
          ...(pedidoId && !relatorio.pedido_id ? { pedido_id: pedidoId } : {}),
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createData: any = {
        ficha_id: ficha.id,
        tipo: 'diagnostico_completo',
        arquivo_pdf_key: key,
        hash_conteudo: hashConteudo,
      };

      if (pedidoId) {
        createData.pedido_id = pedidoId;
      }

      await prisma.relatorio.create({
        data: createData,
      });
    }
  } catch (dbError) {
    console.warn('[Relatorio] Aviso de banco ao registrar relatório (retornando HTML normalmente):', dbError);
  }

  return {
    buffer: htmlBuffer,
    mime: 'text/html',
    key,
  };
}
