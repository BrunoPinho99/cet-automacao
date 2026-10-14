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
}

// Base demonstrativa de empresas populares de vários segmentos para busca imediata
const EMPRESAS_DEMO: EmpresaSugestao[] = [
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
  },
  {
    cnpj: '67.890.123/0001-45',
    razao_social: 'Comércio de Alimentos & Supermercado Bom Preço Ltda',
    nome_fantasia: 'Supermercado Bom Preço',
    cidade: 'Salvador',
    uf: 'BA',
    cnae: '4711-3/02',
    cnae_descricao: 'Comércio varejista de mercadorias em geral com predominância de produtos alimentícios',
    porte: 'EPP',
    grau_risco: 2,
  },
  {
    cnpj: '78.901.234/0001-56',
    razao_social: 'Auto Posto & Conveniência Estrela do Sul Ltda',
    nome_fantasia: 'Posto Estrela',
    cidade: 'Porto Alegre',
    uf: 'RS',
    cnae: '4731-8/00',
    cnae_descricao: 'Comércio varejista de combustíveis para veículos automotores',
    porte: 'EPP',
    grau_risco: 3,
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
  },
  {
    cnpj: '90.123.456/0001-78',
    razao_social: 'Clínica Odontológica & Saúde Sorriso Perfeito Ltda',
    nome_fantasia: 'Sorriso Perfeito Odonto',
    cidade: 'Goiânia',
    uf: 'GO',
    cnae: '8630-5/04',
    cnae_descricao: 'Atividade odontológica com recursos para realização de procedimentos cirúrgicos',
    porte: 'ME',
    grau_risco: 3,
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const termo = (searchParams.get('q') || '').trim();

    if (!termo || termo.length < 2) {
      return NextResponse.json({ resultados: [] });
    }

    const apenasDigitos = termo.replace(/\D/g, '');

    // Se o usuário digitou ou colou um CNPJ com 14 dígitos (ou pelo menos 11)
    if (apenasDigitos.length === 14) {
      try {
        // Consulta na BrasilAPI
        const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${apenasDigitos}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 CET-Automacao' },
          next: { revalidate: 3600 },
        });

        if (resBrasil.ok) {
          const data = await resBrasil.json();
          const resultado: EmpresaSugestao = {
            cnpj: data.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
            razao_social: data.razao_social || data.nome_fantasia || 'Empresa Localizada',
            nome_fantasia: data.nome_fantasia || undefined,
            cidade: data.municipio || '',
            uf: data.uf || '',
            cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : undefined,
            cnae_descricao: data.cnae_fiscal_descricao || undefined,
            porte: data.porte || 'Micro/Pequena Empresa',
            grau_risco: estimarGrauRisco(data.cnae_fiscal_descricao || ''),
          };

          return NextResponse.json({ resultados: [resultado] });
        }
      } catch (err) {
        console.warn('[Busca CNPJ BrasilAPI] Falhou, prosseguindo com busca local:', err);
      }
    }

    // Busca no banco local
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
          razao_social: e.razao_social,
          nome_fantasia: e.nome_fantasia || undefined,
          cidade: e.cidade || '',
          uf: e.uf || '',
          grau_risco: e.grau_risco || 2,
        });
      });
    } catch {
      // Ignora erro de query ao banco
    }

    // Busca na base de empresas de demonstração e segmentos
    const termoLower = termo.toLowerCase();
    const demoFiltradas = EMPRESAS_DEMO.filter((e) => {
      const matchRazao = e.razao_social.toLowerCase().includes(termoLower);
      const matchFantasia = e.nome_fantasia?.toLowerCase().includes(termoLower);
      const matchCnpj = e.cnpj.replace(/\D/g, '').includes(apenasDigitos);
      const matchCidade = e.cidade.toLowerCase().includes(termoLower);
      const matchCnae = e.cnae_descricao?.toLowerCase().includes(termoLower);
      return matchRazao || matchFantasia || matchCnpj || matchCidade || matchCnae;
    });

    // Unir resultados sem duplicar CNPJ
    const cnpjsAdicionados = new Set<string>();
    const todosResultados: EmpresaSugestao[] = [];

    [...resultadosLocais, ...demoFiltradas].forEach((item) => {
      const clean = item.cnpj.replace(/\D/g, '');
      if (!cnpjsAdicionados.has(clean)) {
        cnpjsAdicionados.add(clean);
        todosResultados.push(item);
      }
    });

    // Se o usuário digitou um nome que não achou exato, permite criar/vincular empresa com aquele nome
    if (todosResultados.length === 0 && termo.length >= 3 && !/^\d+$/.test(termo)) {
      todosResultados.push({
        cnpj: 'Clique para autogerar o diagnóstico desta empresa',
        razao_social: termo.toUpperCase(),
        nome_fantasia: termo,
        cidade: 'Sua Cidade',
        uf: 'SP',
        cnae_descricao: 'Comércio / Serviços Gerais',
        porte: 'Pequeno Porte',
        grau_risco: 2,
      });
    }

    return NextResponse.json({ resultados: todosResultados.slice(0, 8) });
  } catch (error) {
    console.error('[GET /api/empresas/busca] Erro:', error);
    return NextResponse.json({ erro: 'Erro ao buscar empresas' }, { status: 500 });
  }
}

function estimarGrauRisco(cnaeDescricao: string): number {
  const desc = cnaeDescricao.toLowerCase();
  if (desc.includes('petróleo') || desc.includes('química') || desc.includes('construção') || desc.includes('metalúrgica')) {
    return 4;
  }
  if (desc.includes('transporte') || desc.includes('hospital') || desc.includes('fabricação') || desc.includes('odont')) {
    return 3;
  }
  if (desc.includes('comércio') || desc.includes('padaria') || desc.includes('supermercado')) {
    return 2;
  }
  return 1;
}
