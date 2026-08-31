# RUNBOOK — CET Automação

Ações operacionais quando cada integração cair.

## WhatsApp / Meta API cair

**Sintoma:** Logs mostram 5xx do `graph.facebook.com`, mensagens não chegam.

**Ações:**
1. Verificar painel Meta Business: https://developers.facebook.com/status
2. Verificar fila BullMQ `mensagem-saida` — mensagens ficam enfileiradas automaticamente
3. Webhook Meta usa retentativa exponencial — aguardar até 15min antes de alarmar
4. Se prolongado: notificar atendentes para monitorar o CRM Ploomes manualmente
5. Não limpar a fila — as mensagens serão reprocessadas quando a API voltar

---

## Asaas cair

**Sintoma:** Checkout não abre, webhook não chega, status de pagamento não atualiza.

**Ações:**
1. Verificar status: https://status.asaas.com
2. A liberação do relatório **NÃO acontece** enquanto o pagamento não for confirmado — isso é a trava de segurança funcionando corretamente
3. Os pedidos ficam com status `aguardando` no banco
4. Quando Asaas voltar, o webhook será reprocessado — idempotência garante que um pagamento libera um único relatório
5. Se o cliente reclamou mas o pagamento foi feito: verificar `webhooks_recebidos` e reprocessar manualmente via admin

**Nunca:** liberar relatório manualmente sem registrar autorização de diretoria em `auditoria`

---

## Ploomes cair

**Sintoma:** Leads não aparecem no CRM, tarefas não são criadas.

**Ações:**
1. O atendimento **não para** — o banco PostgreSQL é a fonte da verdade
2. A fila `ploomes-sync` acumula os eventos para sincronização posterior
3. Verificar dead-letter queue no BullMQ para eventos com mais de 5 tentativas
4. Quando Ploomes voltar, processar a fila: `pnpm --filter @cet/api queue:retry ploomes-sync`
5. Verificar se há CNPJs duplicados após resync: `pnpm --filter @cet/api db:check-duplicates`

---

## Banco de Dados (Postgres) cair

**Sintoma:** API retorna 500, sem resposta da ficha.

**Ações:**
1. Verificar container: `docker compose -f infra/docker-compose.yml ps`
2. Ver logs: `docker compose -f infra/docker-compose.yml logs postgres`
3. Reiniciar: `docker compose -f infra/docker-compose.yml restart postgres`
4. Em produção: verificar painel do provedor (ex: Supabase, RDS)
5. **Nunca rodar** `prisma migrate reset` em produção sem backup confirmado

---

## Redis / Filas cair

**Sintoma:** Integrações (Ploomes, e-mails) param de funcionar; pagamentos não são processados.

**Ações:**
1. Verificar container: `docker compose -f infra/docker-compose.yml ps redis`
2. Reiniciar: `docker compose -f infra/docker-compose.yml restart redis`
3. BullMQ com persistência — os jobs ficam em disco e serão reprocessados
4. Alertas de fila morta chegam por e-mail (configurado em `EMAIL_RELATORIO_DESTINO`)

---

## Relatório duplicado suspeito

**Sintoma:** Cliente afirma ter recebido 2 relatórios para 1 pagamento.

**Ações:**
1. Verificar na tabela `relatorios`: `SELECT * FROM relatorios WHERE pedido_id = '<ID>';`
2. A constraint `UNIQUE` em `pedido_id` impede fisicamente duplicatas no banco
3. Se há 2 linhas: cenário impossível pela arquitetura — investigar corrupção de dados
4. Verificar `webhooks_recebidos` pelo `payload_hash` — idempotência deve ter bloqueado reprocessamento
5. Abrir incidente e não apagar evidências antes de investigar
