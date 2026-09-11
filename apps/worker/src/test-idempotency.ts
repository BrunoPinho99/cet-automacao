import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@cet/db';
import { DomainEvents } from '@cet/shared';

async function runTest() {
  console.log('Iniciando teste de idempotência...');
  
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const relatoriosQueue = new Queue('relatorios-fila', { connection });

  // Pega ou cria um pedido para teste
  let pedido = await prisma.pedido.findFirst();

  if (!pedido) {
    const lead = await prisma.lead.findFirst() || await prisma.lead.create({
      data: {
        nome: 'Lead Teste Idempotência',
        email: 'idempotencia@teste.com',
        telefone: '11999999999'
      }
    });

    pedido = await prisma.pedido.create({
      data: {
        lead_id: lead.id,
        produto: 'diagnostico_completo',
        valor_centavos: 29700,
        status: 'PAGO',
        asaas_payment_id: 'pay_test_' + Date.now(),
        idempotency_key: 'test_idem_' + Date.now()
      }
    });
  }

  const eventId = `test-idempotency-${Date.now()}`;

  console.log(`Enviando 2 eventos idênticos (pagamento.confirmado) para o pedido ${pedido.id}...`);

  await relatoriosQueue.add(DomainEvents.PAGAMENTO_CONFIRMADO, {
    pedido_id: pedido.id,
    event_id: eventId
  });

  await relatoriosQueue.add(DomainEvents.PAGAMENTO_CONFIRMADO, {
    pedido_id: pedido.id,
    event_id: eventId
  });

  console.log('Eventos enviados. Aguardando processamento do worker...');

  // Espera alguns segundos para o worker (que deve estar rodando em outra aba/processo) processar
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Verifica quantos relatórios existem para o pedido
  const count = await prisma.relatorio.count({
    where: { pedido_id: pedido.id }
  });

  console.log(`=== RESULTADO ===`);
  console.log(`Relatórios encontrados para o pedido: ${count}`);

  if (count === 1) {
    console.log('✅ SUCESSO: Apenas um relatório foi gerado. A geração é idempotente!');
  } else {
    console.error(`❌ FALHA: Encontrados ${count} relatórios. Esperado: 1`);
  }

  process.exit(0);
}

runTest().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
