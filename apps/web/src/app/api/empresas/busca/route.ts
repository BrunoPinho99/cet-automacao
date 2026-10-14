import { NextResponse } from 'next/server';
import { prisma } from '@cet/db';

interface EmpresaSugestao {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  cidade: string;
  uf: string;
  cnae?: string;
  cnae_descricao?: string;
  porte?: string;
  grau_risco?: number;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  origem?: 'receita_federal' | 'local' | 'demo';
}

// Base demonstrativa de empresas populares de vários segmentos para busca imediata por nome
const EMPRESAS_DEMO: EmpresaSugestao[] = [
  {
    cnpj: '10.612.223/0001-63',
    razao_social: 'CET — Clínica Especializada em Medicina e Segurança do Trabalho Ltda',
    nome_fantasia: 'CET Segurança e Medicina do Trabalho',
    cidade: 'São Paulo',
    uf: 'SP',
    cnae: '8630-5/03',
    cnae_descricao: 'Atividade médica ambulatorial, exames ocupacionais e SST',
    porte: 'Demais',
    grau_risco: 2,
    origem: 'local',
  },
  {
    cnpj: '19.190.880/0001-34',
    razao_social: 'CET Engenharia, Laudos Ocupacionais e eSocial Ltda',
    nome_fantasia: 'CET Engenharia Ocupacional',
    cidade: 'Campinas',
    uf: 'SP',
    cnae: '7112-0/00',
    cnae_descricao: 'Serviços de engenharia, PGR, PCMSO e consultoria em segurança ocupacional',
    porte: 'EPP',
    grau_risco: 3,
    origem: 'local',
  },
  {
    cnpj: '00.000.000/0001-91',
    razao_social: 'Banco do Brasil S.A.',
    nome_fantasia: 'Banco do Brasil',
    cidade: 'Brasília',
    uf: 'DF',
    cnae: '6422-1/00',
    cnae_descricao: 'Bancos múltiplos com carteira comercial',
    porte: 'Demais',
    grau_risco: 1,
    origem: 'demo',
  },
  {
    cnpj: '33.000.167/0001-01',
    razao_social: 'Petróleo Brasileiro S.A. - Petrobras',
    nome_fantasia: 'Petrobras',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    cnae: '1921-7/00',
    cnae_descricao: 'Fabricação de produtos do refino de petróleo',
    porte: 'Demais',
    grau_risco: 4,
    origem: 'demo',
  },
  {
    cnpj: '03.007.331/0001-41',
    razao_social: 'Ambev S.A.',
    nome_fantasia: 'Cervejaria Ambev',
    cidade: 'São Paulo',
    uf: 'SP',
    cnae: '1113-5/02',
    cnae_descricao: 'Fabricação de cervejas e chopes',
    porte: 'Demais',
    grau_risco: 3,
    origem: 'demo',
  },
  {
    cnpj: '47.960.950/0001-21',
    razao_social: 'Magazine Luiza S.A.',
    nome_fantasia: 'Magalu',
    cidade: 'Franca',
    uf: 'SP',
    cnae: '4713-0/04',
    cnae_descricao: 'Lojas de departamentos ou magazines',
    porte: 'Demais',
    grau_risco: 2,
    origem: 'demo',
  },
  {
    cnpj: '12.345.678/0001-90',
    razao_social: 'Metalúrgica Aliança & Soldas Industriais Ltda',
    nome_fantasia: 'Aliança Soldas',
    cidade: 'São Paulo',
    uf: 'SP',
    cnae: '2511-0/00',
    cnae_descricao: 'Fabricação de estruturas metálicas',
    porte: 'EPP',
    grau_risco: 3,
    origem: 'demo',
  },
  {
    cnpj: '23.456.789/0001-01',
    razao_social: 'Construtora e Engenharia Horizonte Forte Ltda',
    nome_fantasia: 'Horizonte Forte Obras',
    cidade: 'Curitiba',
    uf: 'PR',
    cnae: '4120-4/00',
    cnae_descricao: 'Construção de edifícios residenciais e comerciais',
    porte: 'Demais',
    grau_risco: 4,
    origem: 'demo',
  },
  {
    cnpj: '34.567.890/0001-12',
    razao_social: 'Transportadora & Logística Rápido Brasil Ltda',
    nome_fantasia: 'Rápido Brasil Cargas',
    cidade: 'Campinas',
    uf: 'SP',
    cnae: '4930-2/02',
    cnae_descricao: 'Transporte rodoviário de carga interestadual e intermunicipal',
    porte: 'EPP',
    grau_risco: 3,
    origem: 'demo',
  },
  {
    cnpj: '45.678.901/0001-23',
    razao_social: 'Hospital e Maternidade São Lucas Ltda',
    nome_fantasia: 'Hospital São Lucas',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    cnae: '8610-1/01',
    cnae_descricao: 'Atividades de atendimento hospitalar geral',
    porte: 'Demais',
    grau_risco: 3,
    origem: 'demo',
  },
  {
    cnpj: '56.789.012/0001-34',
    razao_social: 'Restaurante & Panificadora Delícias do Trigo Ltda',
    nome_fantasia: 'Panificadora Delícias do Trigo',
    cidade: 'Santos',
    uf: 'SP',
    cnae: '1091-1/02',
    cnae_descricao: 'Fabricação de produtos de padaria e confeitaria',
    porte: 'ME',
    grau_risco: 2,
    origem: 'demo',
  },
  {
    cnpj: '67.890.123/0001-45',
    razao_social: 'Comércio de Alimentos & Supermercado Bom Preço Ltda',
    nome_fantasia: 'Supermercado Bom Preço',
    cidade: 'Salvador',
    uf: 'BA',
    cnae: '4711-3/02',
    cnae_descricao: 'Comércio varejista de mercadorias em geral',
    porte: 'EPP',
    grau_risco: 2,
    origem: 'demo',
  },
  {
    cnpj: '78.901.234/0001-56',
    razao_social: 'Auto Posto & Conveniência Estrela do Sul Ltda',
    nome_fantasia: 'Posto Estrela',
    cidade: 'Porto Alegre',
    uf: 'RS',
    cnae: '4731-8/00',
    cnae_descricao: 'Comércio varejista de combustíveis para veículos',
    porte: 'EPP',
    grau_risco: 3,
    origem: 'demo',
  },
  {
    cnpj: '89.012.345/0001-67',
    razao_social: 'Indústria Química & Tintas ColorMax do Brasil S.A.',
    nome_fantasia: 'Tintas ColorMax',
    cidade: 'Joinville',
    uf: 'SC',
    cnae: '2071-1/00',
    cnae_descricao: 'Fabricação de tintas, vernizes, esmaltes e lacas',
    porte: 'Demais',
    grau_risco: 4,
    origem: 'demo',
  },
  {
    cnpj: '90.123.456/0001-78',
    razao_social: 'Clínica Odontológica & Saúde Sorriso Perfeito Ltda',
    nome_fantasia: 'Sorriso Perfeito Odonto',
    cidade: 'Goiânia',
    uf: 'GO',
    cnae: '8630-5/04',
    cnae_descricao: 'Atividade odontológica ambulatorial',
    porte: 'ME',
    grau_risco: 3,
    origem: 'demo',
  },
];

/**
 * Consulta de CNPJ com redundância tripla gratuita:
 * 1. BrasilAPI (aberta, sem token)
 * 2. Minha Receita (aberta, sem token)
 * 3. CNPJ.ws pública
 */
async function consultarCnpjRedundante(cnpjLimpo: string): Promise<EmpresaSugestao | null> {
  // 1. Tentar BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 CET-Automacao' },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        cnpj: data.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
        razao_social: data.razao_social || data.nome_fantasia || 'Empresa Localizada',
        nome_fantasia: data.nome_fantasia || undefined,
        cidade: data.municipio || '',
        uf: data.uf || '',
        cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : undefined,
        cnae_descricao: data.cnae_fiscal_descricao || undefined,
        porte: data.porte || 'Micro/Pequena Empresa',
        grau_risco: estimarGrauRisco(data.cnae_fiscal_descricao || ''),
        logradouro: data.logradouro || undefined,
        numero: data.numero || undefined,
        bairro: data.bairro || undefined,
        cep: data.cep || undefined,
        origem: 'receita_federal',
      };
    }
  } catch (err) {
    console.warn('[BrasilAPI] Falhou, tentando MinhaReceita...', err);
  }

  // 2. Tentar Minha Receita
  try {
    const res = await fetch(`https://minhareceita.org/${cnpjLimpo}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 CET-Automacao' },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        cnpj: (data.cnpj || cnpjLimpo).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
        razao_social: data.razao_social || data.nome_fantasia || 'Empresa Localizada',
        nome_fantasia: data.nome_fantasia || undefined,
        cidade: data.municipio || '',
        uf: data.uf || '',
        cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : undefined,
        cnae_descricao: data.cnae_fiscal_descricao || undefined,
        porte: data.porte || 'Micro/Pequena Empresa',
        grau_risco: estimarGrauRisco(data.cnae_fiscal_descricao || ''),
        logradouro: data.logradouro || undefined,
        numero: data.numero || undefined,
        bairro: data.bairro || undefined,
        cep: data.cep || undefined,
        origem: 'receita_federal',
      };
    }
  } catch (err) {
    console.warn('[MinhaReceita] Falhou, tentando CNPJ.ws...', err);
  }

  // 3. Tentar publica.cnpj.ws
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjLimpo}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 CET-Automacao' },
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      const est = data.estabelecimento || {};
      return {
        cnpj: cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
        razao_social: data.razao_social || est.nome_fantasia || 'Empresa Localizada',
        nome_fantasia: est.nome_fantasia || undefined,
        cidade: est.cidade?.nome || '',
        uf: est.estado?.sigla || '',
        cnae: est.atividade_principal?.subclasse ? String(est.atividade_principal.subclasse) : undefined,
        cnae_descricao: est.atividade_principal?.descricao || undefined,
        porte: data.porte?.descricao || 'Pequeno Porte',
        grau_risco: estimarGrauRisco(est.atividade_principal?.descricao || ''),
        logradouro: est.logradouro || undefined,
        numero: est.numero || undefined,
        bairro: est.bairro || undefined,
        cep: est.cep || undefined,
        origem: 'receita_federal',
      };
    }
  } catch (err) {
    console.warn('[CNPJ.ws] Falhou também:', err);
  }

  return null;
}

/**
 * Busca aberta de empresas do Brasil inteiro por Razão Social ou Nome Fantasia
 * Utiliza o indexador da base aberta da Receita Federal (api.cnpj.pw / busca difusa)
 * 100% gratuita, sem token e sem custos de API.
 */
async function buscarEmpresasNacionaisPorNome(termo: string): Promise<EmpresaSugestao[]> {
  const resultados: EmpresaSugestao[] = [];

  // Se houver APIFY_TOKEN configurado, tenta buscar via Actor do Apify (brazil-cnpj-receita-federal-crawler)
  const apifyToken = process.env.APIFY_TOKEN || process.env.APIFY_API_KEY;
  if (apifyToken) {
    try {
      const apifyRes = await fetch(
        `https://api.apify.com/v2/acts/jungle_synthesizer~brazil-cnpj-receita-federal-crawler/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: termo, maxItems: 6 }),
          signal: AbortSignal.timeout(4500),
        }
      );
      if (apifyRes.ok) {
        const apifyData = await apifyRes.json();
        if (Array.isArray(apifyData) && apifyData.length > 0) {
          for (const item of apifyData) {
            const rawCnpj = (item.cnpj || item.taxId || '').replace(/\D/g, '');
            if (rawCnpj.length === 14) {
              resultados.push({
                cnpj: rawCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
                razao_social: item.razao_social || item.legalName || termo.toUpperCase(),
                nome_fantasia: item.nome_fantasia || item.tradeName || undefined,
                cidade: item.municipio || item.city || 'Brasil',
                uf: item.uf || item.state || 'BR',
                cnae_descricao: item.cnae_fiscal_descricao || item.cnaeDescription || estimarCnaeDescricao(item.razao_social || termo),
                porte: item.porte || 'Demais',
                grau_risco: estimarGrauRisco(item.cnae_fiscal_descricao || item.razao_social || ''),
                origem: 'receita_federal',
              });
            }
          }
          if (resultados.length > 0) {
            return resultados;
          }
        }
      }
    } catch (apifyErr) {
      console.warn('[Apify Actor] Falha na chamada síncrona, usando fallback:', apifyErr);
    }
  }

  try {
    // 1. Tentar busca por razão social
    const url = `https://api.cnpj.pw/busca_difusa/?razao_social=${encodeURIComponent(termo)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 CET-Automacao' },
      signal: AbortSignal.timeout(3500),
    });

    let data = res.ok ? await res.json() : null;
    let lista = data?.resultados_paginacao || [];

    // 2. Se trouxer poucos resultados, tentar por nome fantasia
    if (lista.length < 3) {
      try {
        const urlFantasia = `https://api.cnpj.pw/busca_difusa/?nome_fantasia=${encodeURIComponent(termo)}`;
        const resFantasia = await fetch(urlFantasia, {
          headers: { 'User-Agent': 'Mozilla/5.0 CET-Automacao' },
          signal: AbortSignal.timeout(2500),
        });
        if (resFantasia.ok) {
          const dataFantasia = await resFantasia.json();
          lista = [...lista, ...(dataFantasia.resultados_paginacao || [])];
        }
      } catch {
        // Ignora
      }
    }

    // Processar os primeiros itens únicos
    const cnpjsAdicionados = new Set<string>();
    const topItems: any[] = [];
    for (const item of lista) {
      if (item.cnpj && item.nome_empresarial && !cnpjsAdicionados.has(item.cnpj)) {
        cnpjsAdicionados.add(item.cnpj);
        topItems.push(item);
        if (topItems.length >= 6) break;
      }
    }

    // Enriquecer os 3 primeiros com UF e Bairro em paralelo
    await Promise.all(
      topItems.slice(0, 3).map(async (item: any) => {
        try {
          const r = await fetch(`https://api.cnpj.pw/estabelecimento/${item.cnpj}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 CET-Automacao' },
            signal: AbortSignal.timeout(1200),
          });
          if (r.ok) {
            const est = await r.json();
            item.uf = est.uf;
            item.bairro = est.bairro;
            item.nome_fantasia = est.nome_fantasia;
            item.logradouro = est.logradouro;
          }
        } catch {
          // Ignora timeout de enriquecimento
        }
      })
    );

    for (const item of topItems) {
      const clean = item.cnpj.replace(/\D/g, '');
      const ufTexto = item.uf ? ` - ${item.uf}` : '';
      const local = item.bairro ? `${item.bairro}${ufTexto}` : item.uf ? `Brasil - ${item.uf}` : 'Brasil';
      resultados.push({
        cnpj: clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
        razao_social: item.nome_empresarial,
        nome_fantasia: item.nome_fantasia || undefined,
        cidade: local,
        uf: item.uf || 'BR',
        cnae_descricao: estimarCnaeDescricao(item.nome_empresarial),
        porte: 'Demais',
        grau_risco: estimarGrauRisco(item.nome_empresarial),
        origem: 'receita_federal',
      });
    }
  } catch (err) {
    console.warn('[Busca Nacional Nome] Erro ao buscar na base nacional:', err);
  }

  return resultados;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const termo = (searchParams.get('q') || searchParams.get('cnpj') || '').trim();

    if (!termo || termo.length < 2) {
      return NextResponse.json({ resultados: [] });
    }

    const apenasDigitos = termo.replace(/\D/g, '');

    // 1. SE FOR CNPJ (14 dígitos): Consulta tripla gratuita com salvamento em cache local
    if (apenasDigitos.length === 14) {
      const empresaExterna = await consultarCnpjRedundante(apenasDigitos);

      if (empresaExterna) {
        // Salva/Atualiza no banco local para que buscas futuras por NOME a encontrem instantaneamente
        try {
          await prisma.empresa.upsert({
            where: { cnpj: apenasDigitos },
            update: {
              razao_social: empresaExterna.razao_social,
              nome_fantasia: empresaExterna.nome_fantasia || null,
              cidade: empresaExterna.cidade,
              uf: empresaExterna.uf,
              cnae_informado: empresaExterna.cnae || null,
              atividade_real: empresaExterna.cnae_descricao || null,
              grau_risco: empresaExterna.grau_risco || 2,
            },
            create: {
              cnpj: apenasDigitos,
              razao_social: empresaExterna.razao_social,
              nome_fantasia: empresaExterna.nome_fantasia || null,
              cidade: empresaExterna.cidade,
              uf: empresaExterna.uf,
              cnae_informado: empresaExterna.cnae || null,
              atividade_real: empresaExterna.cnae_descricao || null,
              grau_risco: empresaExterna.grau_risco || 2,
            },
          });
        } catch (dbErr) {
          console.warn('[Auto-cache Empresa] Erro ao salvar no banco local:', dbErr);
        }

        return NextResponse.json({
          resultados: [empresaExterna],
          origem: 'receita_federal',
          mensagem: 'Empresa consultada na base oficial nacional (Receita Federal)',
        });
      }
    }

    // 2. BUSCA NO BANCO DE DADOS LOCAL (Empresas já cadastradas ou consultadas)
    const resultadosLocais: EmpresaSugestao[] = [];
    try {
      const empresasDb = await prisma.empresa.findMany({
        where: {
          OR: [
            { razao_social: { contains: termo, mode: 'insensitive' } },
            { nome_fantasia: { contains: termo, mode: 'insensitive' } },
            ...(apenasDigitos.length >= 4 ? [{ cnpj: { contains: apenasDigitos } }] : []),
          ],
        },
        take: 10,
      });

      empresasDb.forEach((e) => {
        resultadosLocais.push({
          cnpj: e.cnpj.length === 14
            ? e.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
            : e.cnpj,
          razao_social: e.razao_social || 'Empresa sem Razão Social',
          nome_fantasia: e.nome_fantasia || undefined,
          cidade: e.cidade || '',
          uf: e.uf || '',
          cnae: e.cnae_informado || undefined,
          cnae_descricao: e.atividade_real || undefined,
          grau_risco: e.grau_risco || 2,
          origem: 'local',
        });
      });
    } catch {
      // Ignora erro de banco local
    }

    // 3. BUSCA NA BASE CURADA DEMONSTRATIVA (CET e populares)
    const termoLower = termo.toLowerCase();
    const demoFiltradas = EMPRESAS_DEMO.filter((e) => {
      const matchRazao = e.razao_social.toLowerCase().includes(termoLower);
      const matchFantasia = e.nome_fantasia ? e.nome_fantasia.toLowerCase().includes(termoLower) : false;
      const matchCnpj = apenasDigitos.length >= 4 ? e.cnpj.replace(/\D/g, '').includes(apenasDigitos) : false;
      const matchCidade = e.cidade.toLowerCase().includes(termoLower);
      const matchCnae = e.cnae_descricao ? e.cnae_descricao.toLowerCase().includes(termoLower) : false;
      return matchRazao || matchFantasia || matchCnpj || matchCidade || matchCnae;
    });

    // 4. BUSCA NACIONAL EM TEMPO REAL NA RECEITA FEDERAL POR NOME (Brasil Inteiro)
    let resultadosNacionais: EmpresaSugestao[] = [];
    if (termo.length >= 3 && !/^\d+$/.test(termo)) {
      resultadosNacionais = await buscarEmpresasNacionaisPorNome(termo);
    }

    // Unir resultados sem duplicar CNPJ:
    // Prioridade: Local -> Nacional Receita Federal -> Demo
    const cnpjsAdicionados = new Set<string>();
    const todosResultados: EmpresaSugestao[] = [];

    [...resultadosLocais, ...resultadosNacionais, ...demoFiltradas].forEach((item) => {
      const clean = item.cnpj.replace(/\D/g, '');
      if (!cnpjsAdicionados.has(clean)) {
        cnpjsAdicionados.add(clean);
        todosResultados.push(item);
      }
    });

    // Se o usuário digitou um nome textual, oferece sempre a opção de usar o nome digitado diretamente
    if (termo.length >= 2 && !/^\d+$/.test(termo)) {
      const jaExisteExato = todosResultados.some(
        (r) => r.razao_social.toLowerCase() === termoLower || r.nome_fantasia?.toLowerCase() === termoLower
      );

      if (!jaExisteExato) {
        todosResultados.push({
          cnpj: 'Preencher CNPJ nos campos abaixo',
          razao_social: termo.toUpperCase(),
          nome_fantasia: termo,
          cidade: 'São Paulo',
          uf: 'SP',
          cnae_descricao: estimarCnaeDescricao(termo),
          porte: 'Demais',
          grau_risco: 2,
          origem: 'local',
        });
      }
    }

    return NextResponse.json({ resultados: todosResultados.slice(0, 8) });
  } catch (error) {
    console.error('[GET /api/empresas/busca] Erro:', error);
    return NextResponse.json({ erro: 'Erro ao buscar empresas' }, { status: 500 });
  }
}

function estimarCnaeDescricao(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes('farmacia') || n.includes('drogaria')) return 'Comércio varejista de produtos farmacêuticos';
  if (n.includes('posto') || n.includes('combustivel')) return 'Comércio varejista de combustíveis para veículos';
  if (n.includes('padaria') || n.includes('confeitaria')) return 'Fabricação de produtos de padaria e confeitaria';
  if (n.includes('hospital') || n.includes('clinica') || n.includes('medica') || n.includes('saude')) return 'Atividades de atenção à saúde / Atendimento médico';
  if (n.includes('odontolog')) return 'Atividade odontológica ambulatorial';
  if (n.includes('restaurante') || n.includes('alimento') || n.includes('refeic')) return 'Serviços de alimentação e restaurantes';
  if (n.includes('transporte') || n.includes('logistica')) return 'Transporte rodoviário de carga e logística';
  if (n.includes('construcao') || n.includes('engenharia') || n.includes('obra')) return 'Construção de edifícios e obras de engenharia';
  if (n.includes('metalurgica') || n.includes('solda') || n.includes('usinagem')) return 'Fabricação de produtos de metal e metalurgia';
  return 'Serviços e Atividades Comerciais em Geral';
}

function estimarGrauRisco(cnaeDescricao: string): number {
  const desc = cnaeDescricao.toLowerCase();
  if (desc.includes('petróleo') || desc.includes('química') || desc.includes('construção') || desc.includes('metalúrgica')) {
    return 4;
  }
  if (desc.includes('transporte') || desc.includes('hospital') || desc.includes('fabricação') || desc.includes('odont')) {
    return 3;
  }
  if (desc.includes('comércio') || desc.includes('padaria') || desc.includes('supermercado') || desc.includes('farmacia') || desc.includes('drogaria')) {
    return 2;
  }
  return 1;
}
