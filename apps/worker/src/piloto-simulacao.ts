import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

const NUM_JORNADAS = 100;
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simularLead() {
  const isClienteAtual = Math.random() > 0.8;
  const cnpj = `11222333000${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;
  
  const payload = {
    cnpj,
    razao_social: `Empresa Simulada ${uuid().slice(0, 8)}`,
    contato: `teste_${uuid().slice(0, 5)}@email.com`,
    protocolo: `SIM-${uuid().slice(0, 8)}`,
    cliente_atual: isClienteAtual
  };

  const res = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const lead = await res.json();
  return { lead, payload };
}

async function simularFicha(token: string) {
  // Aleatoriza respostas para cair em Rotas A, B, C ou X
  const trabalhadores = Math.floor(Math.random() * 200) + 1;
  const temAcidente = Math.random() > 0.8; // 20% chance
  
  const blocks = {
    bloco_1: {
      cnpj: '11222333000199',
      razao_social: 'Simulada',
      cep: '01000-000',
      endereco: 'Rua A'
    },
    bloco_2: {
      trabalhadores_proprios: trabalhadores,
      trabalhadores_terceiros: Math.floor(trabalhadores * 0.2),
      cnae: '0000-0/00',
      grau_risco: 3,
      estados_atendidos: ['SP']
    },
    bloco_3: {
      possui_pgr: true,
      possui_pcmso: true,
      realiza_exames_periodicos: true,
      possui_cipa: trabalhadores > 50,
      treinamentos_em_dia: true,
      possui_ltcat: true,
      possui_avcb: true
    },
    bloco_4: {
      possui_processos_trabalhistas: false,
      tem_acidente_recente: temAcidente,
      tem_fiscalizacao: false,
      possui_medico_coordenador: true,
      prazo_urgente: temAcidente
    },
    bloco_5: {
      responsavel_sst: 'João',
      email_responsavel: 'joao@email.com',
      telefone_responsavel: '11999999999'
    },
    bloco_6: {
      consentimento_lgpd: true
    }
  };

  const res = await fetch(`${API_URL}/ficha`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, respostas: blocks, finalizar: true })
  });

  return await res.json();
}

async function simularWebhookPagamento(leadId: string, asaasPaymentId: string) {
  const payloadWebhook = {
    event: 'PAYMENT_CONFIRMED',
    payment: { id: asaasPaymentId }
  };
  
  // Pegar pedido mock
  const pedido = await prisma.pedido.create({
    data: {
      lead_id: leadId,
      produto: 'diagnostico_pago',
      valor: 199.9,
      status: 'pendente',
      asaas_payment_id: asaasPaymentId,
    }
  });

  const res = await fetch(`${API_URL}/asaas`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'asaas-access-token': process.env.ASAAS_WEBHOOK_SECRET || 'teste_secret' 
    },
    body: JSON.stringify(payloadWebhook)
  });

  return { status: res.status, pedido };
}

async function runPilot() {
  console.log(`Iniciando Piloto com ${NUM_JORNADAS} jornadas...`);
  let successCount = 0;
  let failureCount = 0;
  let duplicatedWebhooksSent = 0;

  const inicioGlob = Date.now();

  for (let i = 0; i < NUM_JORNADAS; i++) {
    try {
      const inicio = Date.now();
      console.log(`\n--- Jornada ${i + 1}/${NUM_JORNADAS} ---`);
      
      // 1. Criar Lead
      const { lead } = await simularLead();
      console.log(`[+] Lead criado: ${lead.id} | Token: ${lead.token_retomada}`);

      // 2. Preencher Ficha
      const fichaRes = await simularFicha(lead.token_retomada);
      if (fichaRes.error) throw new Error(`Erro na ficha: ${fichaRes.error}`);
      
      console.log(`[+] Ficha Finalizada. Rotas calculadas.`);

      // 3. Simular falha injetada: Webhook duplicado (Idempotência)
      // 10% das vezes vamos simular o webhook batendo duas vezes ao mesmo tempo
      const asaasPaymentId = `sim_pay_${uuid()}`;
      if (Math.random() < 0.1) {
        console.log(`[!] Injetando Falha: Webhooks simultâneos para teste de idempotência`);
        duplicatedWebhooksSent++;
        await Promise.all([
          simularWebhookPagamento(lead.id, asaasPaymentId),
          simularWebhookPagamento(lead.id, asaasPaymentId)
        ]);
      } else {
        await simularWebhookPagamento(lead.id, asaasPaymentId);
      }

      console.log(`[+] Webhook processado. Evento na fila Outbox.`);

      const fim = Date.now();
      console.log(`[+] Sucesso. Tempo da jornada (síncrono): ${fim - inicio}ms`);
      successCount++;
    } catch (e: any) {
      console.error(`[-] Falha na jornada ${i + 1}:`, e.message);
      failureCount++;
    }
    
    // Pequena pausa para o banco não estourar pool no ambiente dev
    await delay(100);
  }

  const fimGlob = Date.now();
  console.log(`\n============================`);
  console.log(`PILOTO FINALIZADO`);
  console.log(`Total: ${NUM_JORNADAS}`);
  console.log(`Sucesso: ${successCount}`);
  console.log(`Falhas de API (Crash): ${failureCount}`);
  console.log(`Webhooks Duplicados (Simulação): ${duplicatedWebhooksSent}`);
  console.log(`Tempo Total: ${(fimGlob - inicioGlob) / 1000}s`);
  console.log(`\nVerifique o /painel no Next.js para ver o tamanho das filas e eventos mortos.`);
}

runPilot().catch(console.error).finally(() => prisma.$disconnect());
