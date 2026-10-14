import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando povoamento de Leads, Fichas, Rotas e Atendimentos demo...\n');

  // Buscar empresas existentes no banco
  const empresas = await prisma.empresa.findMany();
  if (empresas.length === 0) {
    console.error('❌ Nenhuma empresa encontrada. Execute o seed base primeiro.');
    process.exit(1);
  }

  const admin = await prisma.usuario.findFirst({ where: { papel: 'admin' } });
  const vendedor = await prisma.usuario.findFirst({ where: { papel: 'comercial' } });

  console.log(`Encontradas ${empresas.length} empresas para gerar leads.`);

  // Cenários para gerar
  const cenarios = [
    {
      cnae: '2512000', // MetalNorte
      rota: 'A',
      rota_completa: 'A',
      sla: 10,
      canal: 'whatsapp',
      contatoNome: 'Carlos Eduardo Mendes',
      contatoCargo: 'Diretor de Operações e SESMT',
      contatoTel: '+5563992011001',
      contatoEmail: 'carlos.mendes@metalnorte.com.br',
      statusFicha: 'concluida',
      classificacaoSst: 'alto_risco',
      scoreTotalSst: 42,
      scoreComercialTotal: 88,
      statusPedido: 'CONFIRMADO',
      valorPedidoCentavos: 4500000, // R$ 45.000,00
      etapaFunil: 'Proposta Apresentada',
      mensagens: [
        { direcao: 'entrada', texto: 'Olá, sou Carlos da MetalNorte. Preenchemos a ficha de diagnóstico da CET.' },
        { direcao: 'saida', texto: 'Olá Carlos! Seja bem-vindo à CET SST. Seu diagnóstico de Rota A foi processado com sucesso. Como podemos ajudar hoje?' },
        { direcao: 'entrada', texto: 'Identificamos necessidade urgente de auditoria de NR-12 e renovação do PGR das nossas 3 unidades industriais. Vocês atendem presencialmente em Araguaína?' },
      ]
    },
    {
      cnae: '8610101', // Hospital Araguaia
      rota: 'A',
      rota_completa: 'A',
      sla: 10,
      canal: 'whatsapp',
      contatoNome: 'Dra. Fernanda Vasconcelos',
      contatoCargo: 'Coordenadora de Medicina do Trabalho',
      contatoTel: '+5563984122002',
      contatoEmail: 'fernanda.vasconcelos@hospitalaraguaia.com.br',
      statusFicha: 'concluida',
      classificacaoSst: 'critico',
      scoreTotalSst: 28,
      scoreComercialTotal: 95,
      statusPedido: 'CONFIRMADO',
      valorPedidoCentavos: 7800000, // R$ 78.000,00
      etapaFunil: 'Negociação Técnica',
      mensagens: [
        { direcao: 'entrada', texto: 'Bom dia. Dra. Fernanda do SESMT do Hospital Araguaia. Concluímos a autoavaliação SST.' },
        { direcao: 'saida', texto: 'Bom dia, Dra. Fernanda! Notamos que o ambiente hospitalar demanda atenção imediata com insalubridade e NR-32.' },
        { direcao: 'entrada', texto: 'Exatamente. Estamos com pendência de envio dos eventos S-2220 e S-2240 no eSocial. Precisamos de consultoria dedicada.' },
      ]
    },
    {
      cnae: '4120400', // Construtora Palmas Verde
      rota: 'B',
      rota_completa: 'B',
      sla: 120,
      canal: 'whatsapp',
      contatoNome: 'Eng. Roberto Albuquerque',
      contatoCargo: 'Engenheiro de Segurança',
      contatoTel: '+5563991033003',
      contatoEmail: 'roberto@palmasverde.com.br',
      statusFicha: 'concluida',
      classificacaoSst: 'atencao',
      scoreTotalSst: 68,
      scoreComercialTotal: 65,
      statusPedido: 'PENDENTE',
      valorPedidoCentavos: 1200000, // R$ 12.000,00
      etapaFunil: 'Qualificação Comercial',
      mensagens: [
        { direcao: 'entrada', texto: 'Boa tarde, equipe CET. Roberto da construtora Palmas Verde.' },
        { direcao: 'saida', texto: 'Boa tarde, Roberto! Vimos seu interesse na adequação para canteiros de obras (NR-18).' },
      ]
    },
    {
      cnae: '1051100', // Indústria Serra Verde
      rota: 'B',
      rota_completa: 'cliente_atual',
      sla: 60,
      canal: 'instagram',
      contatoNome: 'Mariana Silveira',
      contatoCargo: 'Gerente Administrativa',
      contatoTel: '+5563981044004',
      contatoEmail: 'mariana@serraverde.ind.br',
      statusFicha: 'concluida',
      classificacaoSst: 'regular',
      scoreTotalSst: 86,
      scoreComercialTotal: 72,
      statusPedido: 'CONFIRMADO',
      valorPedidoCentavos: 850000,
      etapaFunil: 'Renovação Anual',
      mensagens: [
        { direcao: 'entrada', texto: 'Olá! Já somos clientes da CET e gostaríamos de atualizar os treinamentos de NR-35 deste semestre.' },
      ]
    },
    {
      cnae: '9313100', // FitVida
      rota: 'C',
      rota_completa: 'C',
      sla: 999,
      canal: 'whatsapp',
      contatoNome: 'Lucas Pinheiro',
      contatoCargo: 'Proprietário',
      contatoTel: '+5563999055005',
      contatoEmail: 'lucas@fitvida.com.br',
      statusFicha: 'concluida',
      classificacaoSst: 'regular',
      scoreTotalSst: 91,
      scoreComercialTotal: 30,
      statusPedido: 'CONFIRMADO',
      valorPedidoCentavos: 2990, // R$ 29,90
      etapaFunil: 'Concluído Digital',
      mensagens: [
        { direcao: 'entrada', texto: 'Oi, realizei o pagamento via PIX para o diagnóstico digital.' },
        { direcao: 'saida', texto: 'Pagamento confirmado com sucesso, Lucas! Seu relatório foi gerado e está disponível.' },
      ]
    },
  ];

  let totalLeadsCriados = 0;

  for (let i = 0; i < empresas.length; i++) {
    const empresa = empresas[i];
    const cenarioMatch = cenarios.find(c => c.cnae === empresa.cnae_informado) || {
      cnae: empresa.cnae_informado,
      rota: empresa.trabalhadores_proprios > 100 ? 'A' : (empresa.trabalhadores_proprios >= 20 ? 'B' : 'C'),
      rota_completa: empresa.trabalhadores_proprios > 100 ? 'A' : (empresa.trabalhadores_proprios >= 20 ? 'B' : 'C'),
      sla: empresa.trabalhadores_proprios > 100 ? 10 : (empresa.trabalhadores_proprios >= 20 ? 120 : 999),
      canal: i % 2 === 0 ? 'whatsapp' : 'instagram',
      contatoNome: `Gestor Responsável ${empresa.nome_fantasia || empresa.cidade}`,
      contatoCargo: 'Gerente / Representante Legal',
      contatoTel: `+556399${String(100000 + i).padStart(6, '0')}`,
      contatoEmail: `contato@empresa${i + 1}.com.br`,
      statusFicha: 'concluida',
      classificacaoSst: (empresa.grau_risco ?? 2) >= 3 ? 'alto_risco' : ((empresa.grau_risco ?? 2) === 2 ? 'atencao' : 'regular'),
      scoreTotalSst: Math.max(20, Math.min(95, 100 - ((empresa.grau_risco ?? 2) * 20))),
      scoreComercialTotal: empresa.trabalhadores_proprios > 100 ? 85 : (empresa.trabalhadores_proprios >= 20 ? 60 : 35),
      statusPedido: i % 3 === 0 ? 'CONFIRMADO' : (i % 3 === 1 ? 'PENDENTE' : 'CRIADO'),
      valorPedidoCentavos: empresa.trabalhadores_proprios > 100 ? 3500000 : (empresa.trabalhadores_proprios >= 20 ? 950000 : 2990),
      etapaFunil: i % 2 === 0 ? 'Proposta Comercial' : 'Em Diagnóstico',
      mensagens: []
    };

    // 1. Contato
    const contato = await prisma.contato.upsert({
      where: { telefone_e164: cenarioMatch.contatoTel },
      update: {},
      create: {
        empresa_id: empresa.id,
        nome: cenarioMatch.contatoNome,
        cargo: cenarioMatch.contatoCargo,
        telefone_e164: cenarioMatch.contatoTel,
        email: cenarioMatch.contatoEmail,
        canal_preferido: cenarioMatch.canal,
      }
    });

    // 2. Lead
    const protocolo = `CET-2026-${String(1000 + i).padStart(6, '0')}`;
    const lead = await prisma.lead.upsert({
      where: { protocolo },
      update: {},
      create: {
        empresa_id: empresa.id,
        contato_id: contato.id,
        canal: cenarioMatch.canal,
        campanha: 'Campanha Diagnóstico SST 2026',
        palavra_chave: 'consultoria_sst',
        primeira_intencao: `Diagnóstico para ${empresa.nome_fantasia || empresa.razao_social}`,
        protocolo,
        atendente_id: vendedor?.id,
      }
    });

    // 3. Ficha
    const ficha = await prisma.ficha.create({
      data: {
        lead_id: lead.id,
        status: cenarioMatch.statusFicha,
        bloco_atual: 4,
        concluida_em: new Date(),
        respostas: {
          possui_pgr: (empresa.grau_risco ?? 2) > 1 ? 'sim' : 'nao',
          possui_pcmso: (empresa.grau_risco ?? 2) > 1 ? 'sim' : 'nao',
          possui_ltcat: (empresa.grau_risco ?? 2) >= 3 ? 'sim' : 'nao',
          envia_esocial: empresa.trabalhadores_proprios > 20 ? 'sim' : 'parcial',
          treinamentos_em_dia: 'parcial',
        }
      }
    });

    // 4. Score Comercial
    await prisma.scoreComercial.create({
      data: {
        ficha_id: ficha.id,
        porte_unidades: empresa.trabalhadores_proprios > 100 ? 30 : 15,
        complexidade: (empresa.grau_risco ?? 2) * 6,
        urgencia: 15,
        potencial: 12,
        qualidade_dados: 10,
        total: cenarioMatch.scoreComercialTotal,
        faixa: cenarioMatch.scoreComercialTotal > 70 ? 'alta' : (cenarioMatch.scoreComercialTotal > 40 ? 'media' : 'digital'),
        versao_regras: 'v1.0',
      }
    });

    // 5. Score SST
    await prisma.scoreSST.create({
      data: {
        ficha_id: ficha.id,
        por_eixo: {
          pgr_gro: { status: 'conforme', nota: 80 },
          pcmso_aso: { status: 'parcial', nota: 50 },
          ltcat_lip: { status: 'nao_conforme', nota: 20 },
          esocial_sst: { status: 'parcial', nota: 60 }
        },
        total: cenarioMatch.scoreTotalSst,
        classificacao: cenarioMatch.classificacaoSst,
        versao_regras: 'v1.0',
      }
    });

    // 6. Rota
    await prisma.rota.create({
      data: {
        ficha_id: ficha.id,
        rota: cenarioMatch.rota,
        rota_completa: cenarioMatch.rota_completa,
        gatilho_critico: cenarioMatch.classificacaoSst === 'critico',
        sla_minutos: cenarioMatch.sla,
        motivos: [
          `Trabalhadores: ${empresa.trabalhadores_proprios}`,
          `Grau de Risco: ${empresa.grau_risco}`,
          `Classificação SST: ${cenarioMatch.classificacaoSst}`
        ],
        responsavel_id: vendedor?.id,
      }
    });

    // 7. Pedido
    await prisma.pedido.create({
      data: {
        lead_id: lead.id,
        produto: cenarioMatch.rota === 'C' ? 'completo' : 'essencial',
        valor_centavos: cenarioMatch.valorPedidoCentavos,
        status: cenarioMatch.statusPedido,
        idempotency_key: `ped-${lead.id}-${Date.now()}`,
        pago_em: cenarioMatch.statusPedido === 'CONFIRMADO' ? new Date() : null,
      }
    });

    // 8. Negócio (Pipeline)
    await prisma.negocio.create({
      data: {
        empresa_id: empresa.id,
        etapa_funil: cenarioMatch.etapaFunil,
        valor_estimado: cenarioMatch.valorPedidoCentavos,
        vendedor_id: vendedor?.id,
        proxima_acao: 'Apresentar proposta de adequação de NR e consultoria continuada',
        prazo_sla: new Date(Date.now() + 86400000 * 2), // +2 dias
      }
    });

    // 9. Mensagens de chat (se houver no cenário)
    if (cenarioMatch.mensagens && cenarioMatch.mensagens.length > 0) {
      for (let m = 0; m < cenarioMatch.mensagens.length; m++) {
        const msg = cenarioMatch.mensagens[m];
        await prisma.mensagem.create({
          data: {
            lead_id: lead.id,
            direcao: msg.direcao,
            canal: cenarioMatch.canal,
            conteudo: msg.texto,
            status: 'entregue',
            wamid: `wamid-demo-${lead.id}-${m}`,
          }
        });
      }
    }

    totalLeadsCriados++;
  }

  // 10. Criar alguns Domain Events para os painéis de saúde/gráficos
  const tiposEventos = ['ficha.concluida', 'score.calculado', 'rota.definida', 'pagamento.confirmado', 'ploomes.sincronizado'];
  for (let e = 0; e < 25; e++) {
    const tipo = tiposEventos[e % tiposEventos.length];
    await prisma.domainEvent.create({
      data: {
        event_id: `ev-demo-${randomUUID()}`,
        tipo,
        status: 'processado',
        tentativas: 1,
        processado_em: new Date(),
        payload: {
          origem: 'seed_demo',
          indice: e
        }
      }
    });
  }

  console.log(`✨ Criados com sucesso:`);
  console.log(`  - ${totalLeadsCriados} Leads completos com Contatos, Fichas, Scores e Negócios`);
  console.log(`  - Mensagens de atendimento comercial inseridas`);
  console.log(`  - 25 Domain Events criados para monitoramento`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed demo:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
