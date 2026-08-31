import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Seeds com 20 empresas fictícias brasileiras — dados puramente de desenvolvimento
// Cobre diversos portes, ramos, estados e rotas

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // -------------------------------------------------------------------
  // 1. Usuários da equipe CET
  // -------------------------------------------------------------------
  const { hash: bcrypt } = await import('bcryptjs').catch(() => {
    // Fallback simples se bcryptjs não estiver disponível nos seeds
    return { hash: (s: string) => Promise.resolve(`$2b$10$seed_hash_${s.slice(0, 10)}`) };
  });

  const senhaHash = await bcrypt('Cet@2026!Dev', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@cet.com.br' },
    update: {},
    create: {
      nome: 'Administrador CET',
      email: 'admin@cet.com.br',
      senha_hash: senhaHash,
      papel: 'admin',
    },
  });

  const vendedor = await prisma.usuario.upsert({
    where: { email: 'vendas@cet.com.br' },
    update: {},
    create: {
      nome: 'Equipe Comercial',
      email: 'vendas@cet.com.br',
      senha_hash: senhaHash,
      papel: 'comercial',
    },
  });

  console.log(`✅ Usuários criados: ${admin.email}, ${vendedor.email}`);

  // -------------------------------------------------------------------
  // 2. Configurações de regras (versão inicial)
  // -------------------------------------------------------------------
  const regras = [
    {
      chave: 'rota.limites',
      valor: {
        A: { min_trabalhadores: 100, min_unidades: 2, min_estados: 2, valor_estimado_min: 500000 },
        B: { min_trabalhadores: 20, max_trabalhadores: 99 },
        C: { max_trabalhadores: 19 },
        sla: { A: 10, B: 120, C: 999 },
      },
    },
    {
      chave: 'score.comercial.pesos',
      valor: {
        porte_unidades: 30,
        complexidade: 25,
        urgencia: 20,
        potencial: 15,
        qualidade_dados: 10,
      },
    },
    {
      chave: 'score.sst.eixos',
      valor: {
        pgr_gro: { peso: 20 },
        pcmso_aso: { peso: 15 },
        ltcat_lip: { peso: 15 },
        esocial_sst: { peso: 15 },
        epi_epc_treinamentos: { peso: 10 },
        ergonomia: { peso: 10 },
        governanca: { peso: 10 },
        nrs_especiais: { peso: 5 },
      },
    },
    {
      chave: 'precos',
      valor: {
        triagem: 0,
        essencial: 1990,   // R$ 19,90 em centavos
        completo: 2990,    // R$ 29,90 em centavos
      },
    },
    {
      chave: 'score.sst.classificacao',
      valor: {
        critico: { min: 0, max: 30 },
        alto_risco: { min: 31, max: 60 },
        atencao: { min: 61, max: 80 },
        regular: { min: 81, max: 100 },
      },
    },
  ];

  for (const regra of regras) {
    await prisma.regraConfig.upsert({
      where: { chave_versao: { chave: regra.chave, versao: 1 } },
      update: {},
      create: { ...regra, versao: 1, alterado_por: admin.id },
    });
  }
  console.log(`✅ ${regras.length} regras de configuração criadas`);

  // -------------------------------------------------------------------
  // 3. Empresas fictícias (20 empresas, dados realistas do Brasil)
  // -------------------------------------------------------------------
  const empresasSeed = [
    // --- Rota A (> 100 trab ou > 2 unidades) ---
    {
      cnpj: '11222333000181',
      razao_social: 'Metalúrgica Norte Tocantins S.A.',
      nome_fantasia: 'MetalNorte',
      cnae_informado: '2512000',
      atividade_real: 'Fabricação de estruturas metálicas',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 240,
      trabalhadores_terceiros: 60,
      unidades: 3,
      estados_atendidos: ['TO', 'PA', 'MA'],
      grau_risco: 3,
    },
    {
      cnpj: '22333444000172',
      razao_social: 'Construtora Palmas Verde Ltda.',
      nome_fantasia: 'Palmas Verde',
      cnae_informado: '4120400',
      atividade_real: 'Construção de edifícios',
      cidade: 'Palmas',
      uf: 'TO',
      trabalhadores_proprios: 180,
      trabalhadores_terceiros: 120,
      unidades: 5,
      estados_atendidos: ['TO', 'GO'],
      grau_risco: 3,
    },
    {
      cnpj: '33444555000163',
      razao_social: 'Frigorífico Boi Dourado S.A.',
      nome_fantasia: 'Boi Dourado',
      cnae_informado: '1012102',
      atividade_real: 'Abate de bovinos',
      cidade: 'Gurupi',
      uf: 'TO',
      trabalhadores_proprios: 520,
      trabalhadores_terceiros: 80,
      unidades: 2,
      estados_atendidos: ['TO', 'GO', 'MT'],
      grau_risco: 4,
    },
    {
      cnpj: '44555666000154',
      razao_social: 'Distribuidora de Combustíveis Cerrado Ltda.',
      nome_fantasia: 'Combustíveis Cerrado',
      cnae_informado: '4731800',
      atividade_real: 'Comércio varejista de combustíveis',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 110,
      trabalhadores_terceiros: 20,
      unidades: 8,
      estados_atendidos: ['TO'],
      grau_risco: 3,
    },
    // --- Rota B (20–99 trab) ---
    {
      cnpj: '55666777000145',
      razao_social: 'Agropecuária Sertão Ltda.',
      nome_fantasia: 'Agro Sertão',
      cnae_informado: '0111301',
      atividade_real: 'Cultivo de soja',
      cidade: 'Pedro Afonso',
      uf: 'TO',
      trabalhadores_proprios: 45,
      trabalhadores_terceiros: 30,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '66777888000136',
      razao_social: 'Supermercado Familiar Centro Ltda.',
      nome_fantasia: 'Super Familiar',
      cnae_informado: '4711302',
      atividade_real: 'Comércio varejista de mercadorias',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 62,
      trabalhadores_terceiros: 8,
      unidades: 2,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '77888999000127',
      razao_social: 'Transportadora Linha Verde Eireli',
      nome_fantasia: 'Linha Verde',
      cnae_informado: '4930201',
      atividade_real: 'Transporte rodoviário de cargas',
      cidade: 'Imperatriz',
      uf: 'MA',
      trabalhadores_proprios: 55,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['MA', 'PA', 'TO'],
      grau_risco: 3,
    },
    {
      cnpj: '88999000000118',
      razao_social: 'Clínica Odontológica Sorrir Sempre Ltda.',
      nome_fantasia: 'Sorrir Sempre',
      cnae_informado: '8630503',
      atividade_real: 'Atividade odontológica',
      cidade: 'Palmas',
      uf: 'TO',
      trabalhadores_proprios: 28,
      trabalhadores_terceiros: 5,
      unidades: 2,
      estados_atendidos: ['TO'],
      grau_risco: 2,
    },
    {
      cnpj: '99000111000109',
      razao_social: 'Escola de Idiomas Conecta Ltda.',
      nome_fantasia: 'Conecta Idiomas',
      cnae_informado: '8599603',
      atividade_real: 'Treinamento em desenvolvimento profissional',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 33,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '10111222000190',
      razao_social: 'Madeireira Tocantins Verde Ltda.',
      nome_fantasia: 'TocVerde Madeiras',
      cnae_informado: '1610201',
      atividade_real: 'Serviços de madeireiros',
      cidade: 'Colinas do Tocantins',
      uf: 'TO',
      trabalhadores_proprios: 78,
      trabalhadores_terceiros: 12,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 3,
    },
    // --- Rota C (1–19 trab) ---
    {
      cnpj: '11222111000182',
      razao_social: 'Barbearia Estilo Moderno Eireli',
      nome_fantasia: 'Barbearia Estilo',
      cnae_informado: '9602501',
      atividade_real: 'Cabeleireiros, manicure e pedicure',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 8,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '22333222000173',
      razao_social: 'Padaria e Confeitaria Pão Fresco Ltda.',
      nome_fantasia: 'Pão Fresco',
      cnae_informado: '1091101',
      atividade_real: 'Fabricação de produtos de padaria',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 12,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 2,
    },
    {
      cnpj: '33444333000164',
      razao_social: 'Auto Elétrica Pinheiro ME',
      nome_fantasia: 'Auto Elétrica Pinheiro',
      cnae_informado: '4520002',
      atividade_real: 'Manutenção e reparação de automóveis',
      cidade: 'Guaraí',
      uf: 'TO',
      trabalhadores_proprios: 6,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 2,
    },
    {
      cnpj: '44555444000155',
      razao_social: 'Farmácia Saúde do Povo Ltda.',
      nome_fantasia: 'Saúde do Povo',
      cnae_informado: '4771702',
      atividade_real: 'Comércio varejista de produtos farmacêuticos',
      cidade: 'Miracema do Tocantins',
      uf: 'TO',
      trabalhadores_proprios: 15,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '55666555000146',
      razao_social: 'Pet Shop Animal Feliz ME',
      nome_fantasia: 'Animal Feliz',
      cnae_informado: '4789004',
      atividade_real: 'Comércio varejista de animais vivos',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 5,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '66777666000137',
      razao_social: 'Escritório de Contabilidade Contas Claras SS Ltda.',
      nome_fantasia: 'Contas Claras',
      cnae_informado: '6920601',
      atividade_real: 'Atividades de contabilidade',
      cidade: 'Palmas',
      uf: 'TO',
      trabalhadores_proprios: 10,
      trabalhadores_terceiros: 2,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '77888777000128',
      razao_social: 'Loja de Materiais de Construção Construção Fácil ME',
      nome_fantasia: 'Construção Fácil',
      cnae_informado: '4744001',
      atividade_real: 'Comércio varejista de ferragens',
      cidade: 'Porto Nacional',
      uf: 'TO',
      trabalhadores_proprios: 9,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    {
      cnpj: '88999888000119',
      razao_social: 'Academia de Musculação FitVida Ltda.',
      nome_fantasia: 'FitVida',
      cnae_informado: '9313100',
      atividade_real: 'Atividades de condicionamento físico',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 14,
      trabalhadores_terceiros: 0,
      unidades: 1,
      estados_atendidos: ['TO'],
      grau_risco: 1,
    },
    // --- Cliente Atual ---
    {
      cnpj: '99000999000100',
      razao_social: 'Indústria de Laticínios Serra Verde Ltda.',
      nome_fantasia: 'Serra Verde',
      cnae_informado: '1051100',
      atividade_real: 'Preparação do leite',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 95,
      trabalhadores_terceiros: 15,
      unidades: 1,
      estados_atendidos: ['TO', 'PA'],
      grau_risco: 2,
      cliente_atual: true,
    },
    {
      cnpj: '10111000000191',
      razao_social: 'Hospital e Maternidade Araguaia S.A.',
      nome_fantasia: 'Hospital Araguaia',
      cnae_informado: '8610101',
      atividade_real: 'Atividades de atendimento hospitalar',
      cidade: 'Araguaína',
      uf: 'TO',
      trabalhadores_proprios: 430,
      trabalhadores_terceiros: 70,
      unidades: 2,
      estados_atendidos: ['TO'],
      grau_risco: 3,
      cliente_atual: true,
    },
  ];

  let criadas = 0;
  for (const empresa of empresasSeed) {
    await prisma.empresa.upsert({
      where: { cnpj: empresa.cnpj },
      update: {},
      create: empresa,
    });
    criadas++;
  }

  console.log(`✅ ${criadas} empresas criadas`);
  console.log('\n✨ Seed concluído com sucesso!');
  console.log('\nResumo:');
  console.log('  - Empresas Rota A (candidatas): 4');
  console.log('  - Empresas Rota B (candidatas): 6');
  console.log('  - Empresas Rota C (candidatas): 8');
  console.log('  - Clientes atuais: 2');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
