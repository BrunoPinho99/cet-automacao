import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const PLOOMES_API_URL = process.env.PLOOMES_API_URL || 'https://api2.ploomes.com';
const PLOOMES_USER_KEY = process.env.PLOOMES_USER_KEY || '';

// Mapeamento simbólico das 11 etapas do Funil do CRM
const ETAPAS_FUNIL = {
  NOVO_LEAD: 1,
  TRIAGEM_INICIADA: 2,
  ROTA_DEFINIDA: 3,
  CONTATO_COMERCIAL: 4,
  PROPOSTA_ENVIADA: 5,
  AGUARDANDO_PAGAMENTO: 6,
  PAGO: 7,
  LIBERACAO_TECNICA: 8,
  RESOLUCAO_MEDICINA: 9,
  RELATORIO_GERADO: 10,
  ENTREGUE_POS_VENDA: 11,
};

async function apiPloomes(endpoint: string, method: string = 'GET', body?: any) {
  if (!PLOOMES_USER_KEY) {
    console.warn('[Ploomes] Chave de API não configurada. Simulando chamada:', endpoint);
    return { value: [{ Id: Math.floor(Math.random() * 100000) }] };
  }

  const res = await fetch(`${PLOOMES_API_URL}${endpoint}`, {
    method,
    headers: {
      'User-Key': PLOOMES_USER_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ploomes API Error: ${res.status} - ${errorText}`);
  }
  
  return res.json();
}

/**
 * Função para sincronizar a empresa e negócio no Ploomes CRM
 */
export async function processarSincroniaPloomes(empresaId: string) {
  // Busca a empresa e os leads recentes
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      contatos: true,
      leads: {
        orderBy: { criado_em: 'desc' },
        take: 1,
        include: { fichas: { include: { rota: true } }, pedidos: true }
      },
      negocios: { take: 1 }
    }
  });

  if (!empresa) throw new Error('Empresa não encontrada para sincronia.');

  console.log(`[Ploomes] Sincronizando empresa ${empresa.cnpj}...`);

  const lead = empresa.leads[0];
  const ficha = lead?.fichas[0];
  const pedido = lead?.pedidos[0];
  const negocio = empresa.negocios[0];

  let ploomesContatoId = empresa.ploomes_id;

  // 1. Criar ou Atualizar Cliente (Contato) no Ploomes
  if (!ploomesContatoId) {
    const resCliente = await apiPloomes('/Contacts', 'POST', {
      Name: empresa.razao_social || `Lead ${empresa.cnpj}`,
      CNPJ: empresa.cnpj,
      TypeId: 1 // Company
    });
    
    ploomesContatoId = resCliente.value[0].Id.toString();

    await prisma.empresa.update({
      where: { id: empresaId },
      data: { ploomes_id: ploomesContatoId }
    });
    console.log(`[Ploomes] Cliente criado com ID ${ploomesContatoId}`);
  }

  // 2. Criar ou Atualizar Deal (Negócio) no Funil
  let ploomesDealId = negocio?.ploomes_deal_id;
  let etapaAtual = ETAPAS_FUNIL.NOVO_LEAD;

  // Identificar a etapa do funil baseado no estado do banco
  if (ficha) etapaAtual = ETAPAS_FUNIL.TRIAGEM_INICIADA;
  if (ficha?.rota) etapaAtual = ETAPAS_FUNIL.ROTA_DEFINIDA;
  if (pedido?.status === 'criado') etapaAtual = ETAPAS_FUNIL.AGUARDANDO_PAGAMENTO;
  if (pedido?.status === 'pago') etapaAtual = ETAPAS_FUNIL.PAGO;

  if (!ploomesDealId) {
    const resDeal = await apiPloomes('/Deals', 'POST', {
      Title: `Implantação SST - ${empresa.cnpj}`,
      ContactId: parseInt(ploomesContatoId),
      StageId: etapaAtual,
      Amount: pedido?.valor_centavos ? pedido.valor_centavos / 100 : 0
    });
    
    ploomesDealId = resDeal.value[0].Id.toString();

    // Salvar o Negócio no banco de dados local
    await prisma.negocio.create({
      data: {
        empresa_id: empresa.id,
        ploomes_deal_id: ploomesDealId,
        etapa_funil: etapaAtual.toString(),
        valor_estimado: pedido?.valor_centavos || 0
      }
    });
    console.log(`[Ploomes] Deal criado com ID ${ploomesDealId} na etapa ${etapaAtual}`);
  } else {
    // Atualizar etapa
    await apiPloomes(`/Deals(${ploomesDealId})`, 'PATCH', {
      StageId: etapaAtual
    });
    
    await prisma.negocio.updateMany({
      where: { ploomes_deal_id: ploomesDealId },
      data: { etapa_funil: etapaAtual.toString() }
    });
    console.log(`[Ploomes] Deal ${ploomesDealId} avançado para etapa ${etapaAtual}`);
  }

  // 3. Criação Automatizada de Tarefas com SLAs (Atribuição)
  // Dependendo da Rota A, B, ou C
  if (ficha?.rota && !negocio?.proxima_acao) {
    let tipoTarefa = 'Contato Consultivo';
    let slaHoras = 48;
    let responsavelEquipeId = 1; // ID Comercial

    if (ficha.rota.rota === 'A') {
      tipoTarefa = 'Alerta Crítico SST';
      slaHoras = 0.16; // ~10 minutos
      responsavelEquipeId = 2; // ID Time Especialista/Técnico
    } else if (ficha.rota.rota === 'B') {
      tipoTarefa = 'Adequação SST';
      slaHoras = 2; // 2 horas
      responsavelEquipeId = 1; // ID Comercial
    } else if (ficha.rota.rota === 'C') {
      tipoTarefa = 'Self-service (Acompanhamento Automação)';
      slaHoras = 24; 
    }

    const prazo = new Date();
    prazo.setMinutes(prazo.getMinutes() + (slaHoras * 60));

    await apiPloomes('/Tasks', 'POST', {
      Title: tipoTarefa,
      ContactId: parseInt(ploomesContatoId),
      DealId: parseInt(ploomesDealId),
      DueDate: prazo.toISOString(),
      OwnerId: responsavelEquipeId
    });

    await prisma.negocio.updateMany({
      where: { ploomes_deal_id: ploomesDealId },
      data: { proxima_acao: tipoTarefa, prazo_sla: prazo }
    });
    console.log(`[Ploomes] Tarefa de SLA criada: ${tipoTarefa} para a Rota ${ficha.rota.rota}`);
  }
}

// Inicia o Worker do BullMQ para Ploomes
export const ploomesWorker = new Worker(
  'ploomes-fila',
  async (job: Job) => {
    console.log(`[Worker Ploomes] Processando job ${job.id}: ${job.name}`);
    if (job.name === 'sincronizar_empresa') {
      const { empresaId } = job.data;
      if (!empresaId) throw new Error('empresaId ausente');
      await processarSincroniaPloomes(empresaId);
    }
  },
  { connection }
);

ploomesWorker.on('completed', (job) => console.log(`[Worker Ploomes] Job ${job.id} concluído`));
ploomesWorker.on('failed', (job, err) => console.error(`[Worker Ploomes] Erro no job ${job?.id}:`, err));
