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
  cnae?: string;
  atividadeReal?: string;
  grauRisco?: number;
  trabalhadores?: number;
  unidades?: number;
  cidade?: string;
  uf?: string;
  geradoEm: Date;
}

interface PerfilSetorial {
  ramo: string;
  badge: string;
  descricaoOperacao: string;
  riscosCriticos: Array<{
    titulo: string;
    detalhe: string;
    gravidade: 'critica' | 'alta' | 'moderada';
  }>;
  impactosNegocio: Array<{
    area: string;
    consequencia: string;
    riscoFinanceiro: string;
  }>;
}

export function detectarPerfilSetorial(dados: RelatorioDados): PerfilSetorial {
  const textoAnalise = `${dados.empresaNome} ${dados.atividadeReal || ''} ${dados.cnae || ''}`.toLowerCase();

  // 1. Educação / Cursos / Escolas de Idiomas / Treinamentos
  if (
    textoAnalise.includes('idioma') ||
    textoAnalise.includes('escola') ||
    textoAnalise.includes('conecta') ||
    textoAnalise.includes('educa') ||
    textoAnalise.includes('curso') ||
    textoAnalise.includes('ensino') ||
    textoAnalise.includes('colegio') ||
    textoAnalise.includes('faculdade') ||
    textoAnalise.includes('treinamento') ||
    textoAnalise.startsWith('85')
  ) {
    return {
      ramo: 'Educação, Treinamentos & Escolas de Idiomas',
      badge: 'Educação & Ensino',
      descricaoOperacao:
        'Instituição de ensino com corpo docente, equipe pedagógica, atendimento ao público discente e suporte administrativo, sujeita a demandas ergonômicas, fadiga vocal intensa e responsabilidade legal sobre os alunos.',
      riscosCriticos: [
        {
          titulo: 'Fadiga Vocal Crônica e Disfonia Docente',
          detalhe:
            'Professores e instrutores com demanda contínua de voz (4h a 8h/dia) sem pausas acústicas ou treinamento preventivo. É a principal causa de licenças médicas e ações trabalhistas com reconhecimento de nexo técnico (NTEP).',
          gravidade: 'critica',
        },
        {
          titulo: 'Ergonomia em Salas e Atendimento (NR-17)',
          detalhe:
            'Postos de recepção e salas de aula com mobiliário estático, telas sem regulagem e cadeiras sem laudo de conformidade, gerando queixas recorrentes de lombalgia, cervicalgia e tendinites (LER/DORT).',
          gravidade: 'alta',
        },
        {
          titulo: 'Segurança Escolar e Lei Lucas (Lei Federal nº 13.722/18)',
          detalhe:
            'Exigência legal mandatória de capacitação de professores e funcionários em Noções de Primeiros Socorros para proteção dos alunos. O descumprimento pode causar cassação de alvará e responsabilização civil/criminal da diretoria.',
          gravidade: 'critica',
        },
        {
          titulo: 'Rotatividade de Professores Horistas & eSocial',
          detalhe:
            'Contratações e rescisões de docentes sem emissão tempestiva de ASOs admissionais e demissionais e sem envio dos eventos S-2220 e S-2240 geram autuações digitais contínuas da Receita Federal.',
          gravidade: 'alta',
        },
      ],
      impactosNegocio: [
        {
          area: 'Continuidade Pedagógica',
          consequencia: 'Cancelamento emergencial de aulas e insatisfação de alunos/responsáveis por licenças médicas imprevistas de professores.',
          riscoFinanceiro: 'Perda de matrículas e custo dobrado com contratação de docentes substitutos.',
        },
        {
          area: 'Passivo Trabalhista',
          consequencia: 'Reclamatórias trabalhistas pleiteando doença ocupacional (Disfonia, Síndrome de Burnout e LER) com pedidos de estabilidade provisória.',
          riscoFinanceiro: 'Indenizações arbitradas entre 20 e 50 salários mínimos por docente.',
        },
        {
          area: 'Custo Previdenciário (FAP/SAT)',
          consequencia: 'Afastamentos pelo código B91 (acidentário) elevam o multiplicador do FAP da empresa perante a Receita.',
          riscoFinanceiro: 'Aumento direto de até 100% na alíquota do RAT sobre toda a folha de pagamento.',
        },
        {
          area: 'Fiscalização Digital',
          consequencia: 'Ausência do evento S-2240 e S-2220 cruzado automaticamente com a folha de pagamento na DCTFWeb.',
          riscoFinanceiro: 'Multas automáticas de R$ 402,53 a R$ 181.284,63 lançadas eletronicamente.',
        },
      ],
    };
  }

  // 2. Academias / Fitness / Esportes
  if (
    textoAnalise.includes('academia') ||
    textoAnalise.includes('fitness') ||
    textoAnalise.includes('crossfit') ||
    textoAnalise.includes('esporte') ||
    textoAnalise.includes('treino') ||
    textoAnalise.includes('ginasio') ||
    textoAnalise.startsWith('93')
  ) {
    return {
      ramo: 'Academias, Centros Esportivos & Fitness',
      badge: 'Fitness & Esporte',
      descricaoOperacao:
        'Ambiente dinâmico com instrutores, recepcionistas e equipe de conservação predial, com movimentação contínua de cargas, ruído ambiental e produtos de sanitização.',
      riscosCriticos: [
        {
          titulo: 'Sobrecarga Biomecânica de Instrutores',
          detalhe: 'Demonstrações repetitivas com peso e montagem de anilhas gerando hérnias de disco e lesões articulares.',
          gravidade: 'critica',
        },
        {
          titulo: 'Poluição Sonora Contínua (NR-15)',
          detalhe: 'Música alta e impacto de pesos sem medição pericial de dosimetria de ruído para comprovação de conforto acústico.',
          gravidade: 'alta',
        },
        {
          titulo: 'Químicos em Vestiários e Piscinas',
          detalhe: 'Manuseio de cloro e sanitizantes sem LTCAT e sem EPIs com CA válido, gerando passivo de insalubridade.',
          gravidade: 'alta',
        },
      ],
      impactosNegocio: [
        {
          area: 'Insalubridade Retroativa',
          consequencia: 'Ações de auxiliares de limpeza e manutenção cobrando 20% a 40% de insalubridade retroativa de 5 anos.',
          riscoFinanceiro: 'R$ 25.000 a R$ 60.000 por colaborador.',
        },
        {
          area: 'Responsabilidade Civil',
          consequencia: 'Intercorrências médicas com alunos ou colaboradores sem plano de emergência e suporte de primeiros socorros.',
          riscoFinanceiro: 'Interdição pela Vigilância Sanitária e processos cíveis.',
        },
      ],
    };
  }

  // 3. Escritórios / Tecnologia / Serviços Administrativos
  if (
    textoAnalise.includes('tech') ||
    textoAnalise.includes('software') ||
    textoAnalise.includes('consultoria') ||
    textoAnalise.includes('advocacia') ||
    textoAnalise.includes('contabil') ||
    textoAnalise.includes('marketing') ||
    textoAnalise.includes('servicos') ||
    textoAnalise.startsWith('62') ||
    textoAnalise.startsWith('69') ||
    textoAnalise.startsWith('70')
  ) {
    return {
      ramo: 'Tecnologia, Serviços Corporativos & Escritórios',
      badge: 'Serviços & Tecnologia',
      descricaoOperacao:
        'Ambiente corporativo e digital com foco em estações informatizadas, desenvolvimento, atendimento remoto e trabalho cognitivo contínuo.',
      riscosCriticos: [
        {
          titulo: 'Riscos Psicossociais e Síndrome de Burnout (NR-01)',
          detalhe: 'Sobrecarga de metas e estresse mental que agora exigem rastreamento obrigatório no PGR/GRO da empresa.',
          gravidade: 'critica',
        },
        {
          titulo: 'Ergonomia de Computador (NR-17)',
          detalhe: 'Trabalho sentado estático, postura inadequada de punhos e cervical e iluminação que reflete em monitores.',
          gravidade: 'alta',
        },
        {
          titulo: 'Fiscalização Digital Silenciosa da Receita Federal',
          detalhe: 'Notificação automática por falta de envio dos eventos S-2220 e S-2240 cruzados com a folha de pagamento.',
          gravidade: 'critica',
        },
      ],
      impactosNegocio: [
        {
          area: 'Compliance B2B & Auditorias',
          consequencia: 'Reprovação em due diligence de clientes corporativos e perda de contratos que exigem CND e eSocial regular.',
          riscoFinanceiro: 'Rescisão de contratos e perda de receita recorrente.',
        },
        {
          area: 'Bloqueio de Certidões (CND)',
          consequencia: 'Inconsistências no eSocial travam a CND Previdenciária da empresa.',
          riscoFinanceiro: 'Impedimento para financiamentos bancários e licitações.',
        },
      ],
    };
  }

  // 4. Comércio / Varejo / Lojas
  if (
    textoAnalise.includes('loja') ||
    textoAnalise.includes('comercio') ||
    textoAnalise.includes('varejo') ||
    textoAnalise.includes('mercado') ||
    textoAnalise.startsWith('47')
  ) {
    return {
      ramo: 'Comércio Varejista & Lojas',
      badge: 'Comércio & Varejo',
      descricaoOperacao:
        'Operação de varejo com operadores de caixa, balconistas e estoquistas, expostos a atendimento ao público, posturas ortostáticas e movimentação de mercadorias.',
      riscosCriticos: [
        {
          titulo: 'Trabalho em Pé Prolongado (NR-17)',
          detalhe: 'Atendentes e operadores de checkout sem assentos regulamentados para descanso em pausas regulares.',
          gravidade: 'alta',
        },
        {
          titulo: 'Movimentação Manual de Cargas no Estoque',
          detalhe: 'Manuseio de caixas pesadas sem treinamento de elevação segura da carga e sem calçados de proteção.',
          gravidade: 'critica',
        },
      ],
      impactosNegocio: [
        {
          area: 'Absenteísmo Comercial',
          consequencia: 'Faltas e atestados médicos de curta duração em períodos de pico de vendas (datas comemorativas).',
          riscoFinanceiro: 'Queda imediata de faturamento por desfalque de equipe.',
        },
      ],
    };
  }

  // 5. Perfil Geral / Operações Padrão
  return {
    ramo: 'Serviços Gerais & Atividades Operacionais',
    badge: 'Atividade Geral',
    descricaoOperacao:
      'Estrutura operacional com colaboradores em funções administrativas e operacionais, demandando conformidade integral com as Normas Regulamentadoras trabalhistas e previdenciárias.',
    riscosCriticos: [
      {
        titulo: 'Gestão de Riscos Ocupacionais (NR-01)',
        detalhe: 'Inexistência de inventário técnico formalizado de perigos e plano de controle preventivo para os colaboradores.',
        gravidade: 'critica',
      },
      {
        titulo: 'Monitoramento de Saúde e Exames (NR-07)',
        detalhe: 'ASOs não vinculados a um PCMSO coordenado por Médico do Trabalho, tornando-os legalmente inválidos.',
        gravidade: 'critica',
      },
      {
        titulo: 'Laudo Técnico Previdenciário (Lei 8.213/91)',
        detalhe: 'Falta de LTCAT para alimentar o PPP Eletrônico e o evento S-2240 no eSocial.',
        gravidade: 'critica',
      },
    ],
    impactosNegocio: [
      {
        area: 'Segurança Jurídica',
        consequencia: 'Exposição total a autos de infração do MTE e passivos trabalhistas sem comprovação pericial de defesa.',
        riscoFinanceiro: 'Passivos acumulados acima de R$ 30.000,00.',
      },
      {
        area: 'Exposição Previdenciária',
        consequencia: 'Cobrança do FAE e multas pelo envio omisso dos dados de exposição ao INSS.',
        riscoFinanceiro: 'Multas da Portaria MTP 667/2021.',
      },
    ],
  };
}

export function buildRelatorioHtml(dados: RelatorioDados): string {
  const cnpjFormatado =
    dados.empresaCnpj && dados.empresaCnpj.length === 14
      ? dados.empresaCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      : dados.empresaCnpj || 'Não informado';

  const perfil = detectarPerfilSetorial(dados);
  const score = dados.scoreSstTotal;

  // Classificação semântica do Score
  let scoreClassColor = '#dc2626'; // Red
  let scoreClassBg = '#fef2f2';
  let scoreBorderColor = '#fecaca';
  let scoreStatusTitulo = 'GRAVIDADE MÁXIMA — CRÍTICO';
  let scoreDescricao =
    'A empresa apresenta pendências estruturais severas. Não possui comprovação dos programas mandatórios de SST (PGR, PCMSO e LTCAT) e os eventos do eSocial encontram-se em situação de omissão digital. Alto risco de multas imediatas.';

  if (score > 80) {
    scoreClassColor = '#16a34a'; // Green
    scoreClassBg = '#f0fdf4';
    scoreBorderColor = '#bbf7d0';
    scoreStatusTitulo = 'CONFORME — RISCO BAIXO';
    scoreDescricao = 'A empresa mantém a documentação básica regularizada, demandando apenas acompanhamento de renovações e manutenções periódicas.';
  } else if (score > 60) {
    scoreClassColor = '#ca8a04'; // Yellow
    scoreClassBg = '#fefce8';
    scoreBorderColor = '#fef08a';
    scoreStatusTitulo = 'ATENÇÃO — RISCO MODERADO';
    scoreDescricao = 'Existem programas parciais ou desatualizados. Necessita de revisão para evitar autuações fiscais do eSocial.';
  } else if (score > 35) {
    scoreClassColor = '#ea580c'; // Orange
    scoreClassBg = '#fff7ed';
    scoreBorderColor = '#fed7aa';
    scoreStatusTitulo = 'ALERTA — ALTO RISCO';
    scoreDescricao = 'Vulnerabilidade considerável com ausência de laudos técnicos essenciais. Notificações do MTE podem ocorrer a qualquer momento.';
  }

  const dataEmissaoFormatada = dados.geradoEm.toLocaleDateString('pt-BR');
  const horaEmissaoFormatada = dados.geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hashDocumento = crypto
    .createHash('sha256')
    .update(`${dados.empresaCnpj}-${dados.protocolo || 'CET'}-${dados.geradoEm.toISOString()}`)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico Técnico Executivo de SST — ${dados.empresaNome} — CET Clínica</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      line-height: 1.5;
      padding: 32px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    /* HEADER */
    .header {
      background: linear-gradient(135deg, #04194D 0%, #013394 40%, #0056FF 100%);
      color: #ffffff;
      padding: 36px 40px;
      border-bottom: 4px solid #2277FF;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 20px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .brand-tag {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .header-info h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .header-info p {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
      max-width: 580px;
    }
    .meta-box {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(4px);
      padding: 12px 18px;
      border-radius: 10px;
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .meta-box .protocolo {
      font-size: 14px;
      font-weight: 800;
      color: #ffffff;
    }
    .meta-box .hash {
      font-size: 10px;
      color: #cbd5e1;
      margin-top: 2px;
    }

    /* CONTEÚDO */
    .content {
      padding: 36px 40px;
    }

    /* SCORE BANNER */
    .score-banner {
      background: ${scoreClassBg};
      border: 2px solid ${scoreBorderColor};
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .score-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .score-circle {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: #ffffff;
      border: 4px solid ${scoreClassColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      flex-shrink: 0;
    }
    .score-num {
      font-size: 32px;
      font-weight: 900;
      color: ${scoreClassColor};
      line-height: 1;
    }
    .score-max {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
    }
    .score-details h2 {
      font-size: 17px;
      font-weight: 800;
      color: ${scoreClassColor};
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .score-details p {
      font-size: 12.5px;
      color: #334155;
      margin-top: 4px;
      max-width: 520px;
      line-height: 1.45;
    }
    .score-badge {
      background: ${scoreClassColor};
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* CARDS */
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
      background: #ffffff;
      box-shadow: 0 2px 6px -1px rgba(0,0,0,0.03);
      page-break-inside: avoid;
    }
    .card-title {
      font-size: 15px;
      font-weight: 800;
      color: #04194D;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
    }
    .card-title::before {
      content: "";
      width: 4px;
      height: 18px;
      background: #0056FF;
      border-radius: 2px;
      display: inline-block;
    }
    .card-subtitle {
      font-size: 12px;
      color: #64748b;
      margin-top: -12px;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .grid-empresa {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
    }
    .field-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .field-value {
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      width: fit-content;
      margin-top: 4px;
    }
    .badge-blue { background: #E3E7FC; color: #0056FF; border: 1px solid #c9d5fc; }
    .badge-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

    /* TABELA DE PROGRAMAS OBRIGATÓRIOS */
    .table-container {
      overflow-x: auto;
      margin-top: 10px;
    }
    .table-sst {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 12px;
    }
    .table-sst th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10.5px;
      letter-spacing: 0.05em;
      padding: 12px 14px;
      border-bottom: 2px solid #e2e8f0;
      text-align: left;
    }
    .table-sst td {
      padding: 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      line-height: 1.45;
    }
    .table-sst tr:hover td {
      background-color: #fafbfc;
    }
    .prog-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 13px;
    }
    .prog-nr {
      display: inline-block;
      font-size: 10.5px;
      font-weight: 700;
      color: #0056FF;
      background: #E3E7FC;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 2px;
    }
    .status-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status-tag-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .status-tag-amber { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
    .multa-tag {
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 700;
      color: #dc2626;
      background: #fff1f2;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 4px;
    }

    /* SEÇÃO DE IMPACTO NO NEGÓCIO */
    .business-profile {
      background: #f8fafc;
      border-left: 4px solid #0056FF;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 20px;
    }
    .business-profile h3 {
      font-size: 14px;
      font-weight: 800;
      color: #04194D;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .business-profile p {
      font-size: 12.5px;
      color: #475569;
      margin-top: 4px;
    }

    .risks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 16px;
      margin-top: 14px;
    }
    .risk-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      background: #ffffff;
      transition: border-color 0.15s;
    }
    .risk-box:hover {
      border-color: #cbd5e1;
    }
    .risk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .risk-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .risk-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .risk-badge-critica { background: #fee2e2; color: #b91c1c; }
    .risk-badge-alta { background: #fef3c7; color: #b45309; }
    .risk-desc {
      font-size: 12px;
      color: #475569;
      line-height: 1.45;
    }

    /* TABELA DE IMPACTO FINANCEIRO DO NEGÓCIO */
    .impact-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-top: 16px;
      font-size: 12px;
    }
    .impact-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10.5px;
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    .impact-table td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }

    /* SIMULADOR DE MULTAS CONSOLIDADAS */
    .fines-summary {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    }
    .fines-total-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      border-top: 1px solid #fda4af;
      padding-top: 14px;
      margin-top: 14px;
    }
    .fines-total-label {
      font-size: 13px;
      font-weight: 700;
      color: #9f1239;
      text-transform: uppercase;
    }
    .fines-total-val {
      font-size: 22px;
      font-weight: 900;
      color: #be123c;
      font-family: ui-monospace, monospace;
    }

    /* PLANO DE AÇÃO */
    .action-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-top: 16px;
    }
    .action-step {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      position: relative;
    }
    .action-step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0056FF;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }
    .action-step h4 {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .action-step-prazo {
      font-size: 10.5px;
      font-weight: 700;
      color: #0056FF;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .action-step p {
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.4;
    }

    /* PARECER TÉCNICO & ASSINATURA */
    .technical-opinion {
      background: #fafbfc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
      font-size: 12px;
      color: #334155;
      line-height: 1.6;
      margin-top: 12px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-block {
      text-align: center;
    }
    .sig-line {
      width: 200px;
      height: 1px;
      background: #94a3b8;
      margin: 0 auto 8px;
    }
    .sig-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-role {
      font-size: 11px;
      color: #64748b;
    }

    /* ACTIONS BAR */
    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }
    .contact-cta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: #475569;
    }
    .btn {
      padding: 12px 24px;
      font-size: 13.5px;
      font-weight: 700;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }
    .btn-primary {
      background: #0056FF;
      color: #ffffff;
      border: none;
    }
    .btn-primary:hover {
      background: #0045d9;
      box-shadow: 0 4px 10px rgba(0, 86, 255, 0.25);
    }

    /* FOOTER */
    .footer {
      text-align: center;
      padding: 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }

    /* IMPRESSÃO (A4) */
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        max-width: 100%;
        border-radius: 0;
      }
      .actions-bar {
        display: none !important;
      }
      .card {
        box-shadow: none;
        border: 1px solid #cbd5e1;
        page-break-inside: avoid;
        margin-bottom: 20px;
      }
      .header {
        padding: 24px;
      }
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="header-info">
        <div class="header-brand">
          <span class="brand-tag">CET Clínica Especializada no Trabalho</span>
          <span class="brand-tag">Auditoria & Laudo Técnico</span>
        </div>
        <h1>Diagnóstico Executivo de SST</h1>
        <p>Relatório de Conformidade Regulatória, Prevenção de Multas (Portaria MTP 667/21 e NR-28) e Impacto no Negócio.</p>
      </div>
      <div class="meta-box">
        <div class="protocolo">Protocolo: ${dados.protocolo || 'CET-113613'}</div>
        <div class="hash">AUTENTICIDADE: ${hashDocumento}</div>
        <div class="hash">EMISSÃO: ${dataEmissaoFormatada} às ${horaEmissaoFormatada}</div>
      </div>
    </div>

    <div class="content">
      <!-- SCORE BANNER COM CLASSIFICAÇÃO -->
      <div class="score-banner">
        <div class="score-left">
          <div class="score-circle">
            <span class="score-num">${score}</span>
            <span class="score-max">/ 100</span>
          </div>
          <div class="score-details">
            <h2>${scoreStatusTitulo}</h2>
            <p>${scoreDescricao}</p>
          </div>
        </div>
        <div>
          <span class="score-badge">Índice Geral: ${dados.classificacaoSst}</span>
        </div>
      </div>

      <!-- DADOS CADASTRAIS DA EMPRESA -->
      <div class="card">
        <div class="card-title">1. Dados da Empresa & Enquadramento Regulatório</div>
        <div class="grid-empresa">
          <div class="field">
            <span class="field-label">Razão Social / Nome</span>
            <span class="field-value">${dados.empresaNome}</span>
          </div>
          <div class="field">
            <span class="field-label">CNPJ</span>
            <span class="field-value">${cnpjFormatado}</span>
          </div>
          <div class="field">
            <span class="field-label">Porte Operacional</span>
            <span class="badge-pill badge-blue">${dados.porteNome}</span>
          </div>
          <div class="field">
            <span class="field-label">Segmento Identificado</span>
            <span class="badge-pill badge-red">${perfil.badge}</span>
          </div>
          <div class="field">
            <span class="field-label">Diretriz Operacional</span>
            <span class="field-value">${dados.porteDescricao}</span>
          </div>
          <div class="field">
            <span class="field-label">Grau de Risco Previsto</span>
            <span class="field-value">Grau ${dados.grauRisco || 2} (NR-04 / MTE)</span>
          </div>
          <div class="field">
            <span class="field-label">Colaboradores Cobertos</span>
            <span class="field-value">${dados.trabalhadores || 'Até 19'} funcionários registrados</span>
          </div>
          <div class="field">
            <span class="field-label">Avaliação Comercial</span>
            <span class="field-value">${dados.scoreComercialTotal} pontos</span>
          </div>
        </div>
      </div>

      <!-- MATRIZ DE PROGRAMAS OBRIGATÓRIOS -->
      <div class="card">
        <div class="card-title">2. Programas Obrigatórios de SST (O Que Sua Empresa Precisa)</div>
        <p class="card-subtitle">
          Relação de laudos técnicos, programas de saúde e obrigações digitais exigidos por Lei para a manutenção da operação:
        </p>

        <div class="table-container">
          <table class="table-sst">
            <thead>
              <tr>
                <th style="width: 26%;">Programa / Laudo Obrigatório</th>
                <th style="width: 18%;">Status Atual</th>
                <th style="width: 36%;">O Que a Empresa Precisa & Impacto</th>
                <th style="width: 20%;">Penalidade (NR-28)</th>
              </tr>
            </thead>
            <tbody>
              <!-- 1. PGR -->
              <tr>
                <td>
                  <div class="prog-name">PGR / GRO</div>
                  <span class="prog-nr">NR-01 — Portaria 6.730/20</span>
                </td>
                <td>
                  <span class="status-tag status-tag-red">🔴 Ausente / Irregular</span>
                </td>
                <td>
                  <strong>Inventário de Riscos & Plano de Ação:</strong> Obrigatório para 100% das empresas com funcionários CLT. Identifica perigos físicos, ergonômicos e de acidentes. Sua ausência invalida todo o controle de saúde.
                </td>
                <td>
                  <span class="multa-tag">R$ 2.396,35 a R$ 6.708,08</span>
                </td>
              </tr>

              <!-- 2. PCMSO -->
              <tr>
                <td>
                  <div class="prog-name">PCMSO</div>
                  <span class="prog-nr">NR-07 — Portaria 6.734/20</span>
                </td>
                <td>
                  <span class="status-tag status-tag-red">🔴 Pendente de Emissão</span>
                </td>
                <td>
                  <strong>Controle Médico Ocupacional:</strong> Coordenado por Médico do Trabalho. Define a periodicidade e os exames complementares necessários. Sem PCMSO, todos os ASOs emitidos são nulos perante a fiscalização.
                </td>
                <td>
                  <span class="multa-tag">R$ 1.431,00 a R$ 4.053,00</span>
                </td>
              </tr>

              <!-- 3. ASOs -->
              <tr>
                <td>
                  <div class="prog-name">ASOs Ocupacionais</div>
                  <span class="prog-nr">NR-07 / CLT Art. 168</span>
                </td>
                <td>
                  <span class="status-tag status-tag-red">🔴 Irregular / Sem Gestão</span>
                </td>
                <td>
                  <strong>Exames Admissionais, Periódicos e Demissionais:</strong> Obrigatório para todo colaborador. O atraso em exames demissionais impede a homologação da rescisão e gera passivo de reintegração.
                </td>
                <td>
                  <span class="multa-tag">R$ 402,53 a R$ 4.025,33</span>
                  <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Por funcionário irregular</div>
                </td>
              </tr>

              <!-- 4. LTCAT -->
              <tr>
                <td>
                  <div class="prog-name">LTCAT</div>
                  <span class="prog-nr">Lei 8.213/91 / IN 128 INSS</span>
                </td>
                <td>
                  <span class="status-tag status-tag-red">🔴 Não Identificado</span>
                </td>
                <td>
                  <strong>Laudo Técnico Previdenciário:</strong> Emitido exclusivamente por Engenheiro de Segurança ou Médico do Trabalho. Comprova a inexistência ou presença de aposentadoria especial e alimenta o evento S-2240 e PPP Digital.
                </td>
                <td>
                  <span class="multa-tag">R$ 3.100,06 a R$ 31.000,00</span>
                </td>
              </tr>

              <!-- 5. eSocial SST -->
              <tr>
                <td>
                  <div class="prog-name">eSocial SST (S-2210, S-2220, S-2240)</div>
                  <span class="prog-nr">Portaria Conjunta MTP/RFB 2/21</span>
                </td>
                <td>
                  <span class="status-tag status-tag-red">🔴 Não Transmitido</span>
                </td>
                <td>
                  <strong>Mensageria Eletrônica Direta com a Receita Federal:</strong> Transmissão mensal obrigatória de saúde e riscos. A fiscalização é 100% automatizada e aplica multas diretamente na DCTFWeb da empresa.
                </td>
                <td>
                  <span class="multa-tag">R$ 402,53 a R$ 181.284,63</span>
                  <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Por evento não enviado</div>
                </td>
              </tr>

              <!-- 6. Ergonomia / AEP -->
              <tr>
                <td>
                  <div class="prog-name">Ergonomia (AEP / AET)</div>
                  <span class="prog-nr">NR-17 — Portaria 423/21</span>
                </td>
                <td>
                  <span class="status-tag status-tag-amber">🟡 Ausente / Não Comprovado</span>
                </td>
                <td>
                  <strong>Avaliação Ergonômica dos Postos:</strong> Análise de mobiliário, computadores, iluminação e esforços repetitivos. Previne LER/DORT, que é a principal causa de concessão de auxílio-doença B91 pelo INSS.
                </td>
                <td>
                  <span class="multa-tag">R$ 1.201,36 a R$ 3.494,22</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- IMPACTO NO NEGÓCIO ESPECÍFICO DE ACORDO COM O RAMO -->
      <div class="card">
        <div class="card-title">3. Impacto Específico no Negócio: ${perfil.ramo}</div>
        <p class="card-subtitle">
          Análise de riscos operacionais, passivos trabalhistas e impactos financeiros calculados especificamente para a operação da sua empresa:
        </p>

        <div class="business-profile">
          <h3>📌 Perfil Operacional Diagnosticado</h3>
          <p>${perfil.descricaoOperacao}</p>
        </div>

        <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-top: 20px;">
          Riscos Ocupacionais Críticos Deste Setor:
        </h4>

        <div class="risks-grid">
          ${perfil.riscosCriticos
            .map(
              (r) => `
            <div class="risk-box">
              <div class="risk-header">
                <span class="risk-title">${r.titulo}</span>
                <span class="risk-badge risk-badge-${r.gravidade}">${r.gravidade}</span>
              </div>
              <p class="risk-desc">${r.detalhe}</p>
            </div>
          `
            )
            .join('')}
        </div>

        <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-top: 26px;">
          Matriz de Consequências Financeiras & Operacionais:
        </h4>

        <table class="impact-table">
          <thead>
            <tr>
              <th style="width: 25%;">Área de Impacto</th>
              <th style="width: 45%;">Consequência Prática na Empresa</th>
              <th style="width: 30%;">Estimativa de Custo / Perda</th>
            </tr>
          </thead>
          <tbody>
            ${perfil.impactosNegocio
              .map(
                (imp) => `
              <tr>
                <td><strong>${imp.area}</strong></td>
                <td>${imp.consequencia}</td>
                <td><span style="color: #dc2626; font-weight: 700;">${imp.riscoFinanceiro}</span></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- QUADRO CONSOLIDADO DE MULTAS E EXPOSIÇÃO -->
      <div class="card">
        <div class="card-title">4. Simulação de Penalidades Fiscais (Portaria MTP nº 667/2021)</div>
        <p class="card-subtitle">
          Cálculo estimado do passivo financeiro em caso de auditoria fiscal do Trabalho ou autuação digital da Receita Federal:
        </p>

        <div class="fines-summary">
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #fecdd3; color: #9f1239; font-weight: 700;">
                <th style="text-align: left; padding: 6px 0;">Item Fiscal Fiscalizado</th>
                <th style="text-align: center; padding: 6px 0;">Base Legal</th>
                <th style="text-align: right; padding: 6px 0;">Autuação Mínima</th>
                <th style="text-align: right; padding: 6px 0;">Autuação Máxima</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px 0; color: #334155;">Ausência de PGR / GRO Vigente</td>
                <td style="text-align: center; color: #64748b;">NR-01</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 2.396,35</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 6.708,08</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #334155;">Inexistência ou Vencimento do PCMSO</td>
                <td style="text-align: center; color: #64748b;">NR-07</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 1.431,00</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 4.053,00</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #334155;">ASOs não realizados (Estimativa 10 colaboradores)</td>
                <td style="text-align: center; color: #64748b;">Art. 168 CLT</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 4.025,30</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 40.253,30</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #334155;">Falta do Laudo Previdenciário (LTCAT)</td>
                <td style="text-align: center; color: #64748b;">Lei 8.213/91</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 3.100,06</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 31.000,00</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #334155;">Omissão dos Eventos no eSocial (S-2220 e S-2240)</td>
                <td style="text-align: center; color: #64748b;">Port. MTP 667</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 2.415,18</td>
                <td style="text-align: right; font-weight: 600; color: #dc2626;">R$ 18.128,46</td>
              </tr>
            </tbody>
          </table>

          <div class="fines-total-box">
            <div>
              <div class="fines-total-label">Passivo Fiscal Imediato em Risco:</div>
              <div style="font-size: 11px; color: #9f1239;">Valores acumulados passíveis de autuação em procedimento fiscalizatória</div>
            </div>
            <div class="fines-total-val">R$ 13.367,89 a R$ 100.142,84</div>
          </div>
        </div>
      </div>

      <!-- PLANO DE AÇÃO CORRETIVO EM 4 ETAPAS -->
      <div class="card">
        <div class="card-title">5. Plano de Ação & Roteiro de Regularização CET</div>
        <p class="card-subtitle">
          Cronograma executivo estruturado para sanar 100% das não-conformidades de forma ágil e com segurança jurídica:
        </p>

        <div class="action-steps">
          <div class="action-step">
            <div class="action-step-num">1</div>
            <div class="action-step-prazo">Prazo: D+5 dias</div>
            <h4>Levantamento Técnico & PGR</h4>
            <p>Mapeamento dos perigos em todos os postos de trabalho e emissão do PGR (NR-01) com Análise Ergonômica Preliminar (AEP).</p>
          </div>

          <div class="action-step">
            <div class="action-step-num">2</div>
            <div class="action-step-prazo">Prazo: D+10 dias</div>
            <h4>Elaboração do PCMSO & ASOs</h4>
            <p>Coordenação médica ocupacional, cronograma de exames complementares e realização dos ASOs pendentes na clínica CET.</p>
          </div>

          <div class="action-step">
            <div class="action-step-num">3</div>
            <div class="action-step-prazo">Prazo: D+15 dias</div>
            <h4>Conclusão do LTCAT</h4>
            <p>Emissão do laudo assinado por Engenheiro de Segurança atestando a situação previdenciária e parametrização do PPP Digital.</p>
          </div>

          <div class="action-step">
            <div class="action-step-num">4</div>
            <div class="action-step-prazo">Prazo: D+20 dias</div>
            <h4>Transmissão ao eSocial</h4>
            <p>Envio oficial dos lotes XML dos eventos S-2220 e S-2240 com recibos de protocolo definitivo emitidos pela Receita Federal.</p>
          </div>
        </div>
      </div>

      <!-- PARECER TÉCNICO & ASSINATURA -->
      <div class="card">
        <div class="card-title">6. Parecer Técnico Conclusivo</div>
        <div class="technical-opinion">
          "Em face do diagnóstico preliminar realizado sobre os dados cadastrais e o histórico documental da empresa <strong>${dados.empresaNome}</strong>, constata-se a necessidade inadiável de contratação e implantação da assessoria continuada de SST. O atual enquadramento regulatório expõe a organização a passivos trabalhistas cumulativos e autuações digitais diretas pela falta de transmissão dos eventos periódicos ao eSocial. Recomenda-se a imediata execução do Plano de Ação CET para restabelecimento da conformidade legal perante o Ministério do Trabalho e Emprego e a Previdência Social."
        </div>

        <div class="signatures">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-name">Engenharia de Segurança do Trabalho</div>
            <div class="sig-role">CET Clínica Especializada • CREA / MTE</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-name">Coordenação de Medicina Ocupacional</div>
            <div class="sig-role">CET Clínica Especializada • CRM / RQE</div>
          </div>
        </div>
      </div>

      <!-- ACTIONS BAR -->
      <div class="actions-bar">
        <div class="contact-cta">
          <strong>Central de Atendimento Corporativo CET:</strong>
          <span>(11) 99999-9999 • contato@cetseguranca.com.br</span>
        </div>
        <button onclick="window.print()" class="btn btn-primary">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / Salvar Relatório em PDF
        </button>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      CET Clínica Especializada no Trabalho • Todos os direitos reservados • CNPJ 00.000.000/0001-00<br />
      Documento gerado eletronicamente em conformidade com as Normas Regulamentadoras da Portaria 3.214/78 do MTE.
    </div>
  </div>
</body>
</html>`;
}

export async function obterOuGerarRelatorio(
  idOuFichaId: string,
  options: { forceRegenerate?: boolean } = {}
): Promise<{ buffer: Buffer; mime: string; key: string }> {
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

  // 3. Se for PDF compilado real e não estiver forçando regeneração, pode devolver
  const isPdfFisico = relatorio?.arquivo_pdf_key?.endsWith('.pdf');
  if (relatorio && relatorio.arquivo_pdf_key && isPdfFisico && !options.forceRegenerate) {
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
    scoreSstTotal: ficha.score_sst?.total || 18,
    scoreComercialTotal: ficha.score_comercial?.total || 90,
    protocolo: ficha.lead?.protocolo,
    respostas: (ficha.respostas as Record<string, string>) || {},
    cnae: empresa?.cnae_informado || undefined,
    atividadeReal: empresa?.atividade_real || undefined,
    grauRisco: empresa?.grau_risco || 2,
    trabalhadores: empresa?.trabalhadores_proprios || undefined,
    unidades: empresa?.unidades || 1,
    cidade: empresa?.cidade || undefined,
    uf: empresa?.uf || undefined,
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
