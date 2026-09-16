# Registro de Decisões Arquiteturais (ADRs)

## 001: Unificação de Interfaces em um Único App Next.js 15
**Data:** 28 de agosto de 2026
**Status:** Aceito

### Contexto
O projeto foi inicialmente planejado para ter múltiplas aplicações separadas (`apps/portal`, `apps/api`, `apps/admin`). Porém, considerando a natureza do Next.js 15 (App Router) que permite criar interfaces e APIs (`route handlers`) de forma robusta e otimizada no mesmo projeto, a manutenção de vários aplicativos adicionaria sobrecarga desnecessária e repetição de código de UI/configurações.

### Decisão
Consolidamos todo o frontend e as rotas de API em um único aplicativo Next.js 15 localizado em `apps/web`. Este aplicativo servirá:
1. **Portal/Ficha:** Rotas acessíveis via links com token (público mas com segurança baseada em URL).
2. **API:** Webhooks para WhatsApp e Instagram, além de endpoints para manipulação de estado do banco (ex: salvar blocos).
3. **Painel Admin:** Rotas protegidas futuramente para gestão interna.

A lógica de negócio pura (Motor de Regras) continua isolada em `packages/core` para facilitar o TDD e testes limpos.

### Consequências
- **Positivas:** Redução da complexidade de deploy, menos processos concorrentes rodando em dev, compartilhamento total da configuração de UI (Tailwind, componentes React).
- **Negativas:** O pacote pode ficar maior, mas Next.js faz code-splitting automático.

## 002: Webhook Asaas e Padrão Outbox (Transacional)
**Data:** 14 de setembro de 2026
**Status:** Aceito

### Contexto
O recebimento de webhooks do Asaas para pagamentos (`PAYMENT_CONFIRMED`) estava sujeito a *race conditions* (quando o Asaas envia o mesmo evento várias vezes quase simultaneamente). O método anterior de "Idempotência Pura" fazia um `findUnique` antes de um `create`, o que poderia levar a geração duplicada de relatórios (pdfs) e instabilidade financeira.

### Decisão
- Adotamos o **Outbox Pattern**. Em vez de acionar a geração do relatório diretamente na rota do webhook, o webhook atualiza o status do `Pedido` para `'pago'` e grava um registro na tabela `DomainEvent` (por exemplo, `pagamento.confirmado`).
- Ambas as operações são envelopadas em um único **`prisma.$transaction`**, garantindo que sejam atômicas.
- Para a **Idempotência Atômica**, removemos a checagem manual (`findUnique`) e inserimos o webhook diretamente na tabela `WebhookRecebido` interceptando o erro **`P2002`** (Unique Constraint Violation) no Prisma. Caso ocorra, retornamos `200 OK` ao Asaas sem processar repetidamente.

## 003: Publicador de Eventos (Worker Background)
**Data:** 14 de setembro de 2026
**Status:** Aceito

### Contexto
Com o padrão Outbox, os `DomainEvents` ficam gravados no banco de dados. Eles precisam ser consumidos por sistemas assíncronos (geração de PDF, sincronização com Ploomes) sem bloquear o loop principal (Next.js).

### Decisão
- Criamos um **Worker dedicado** (`apps/worker`) contendo um Publicador que realiza um *polling* periódico buscando eventos com `status = 'pendente'`.
- Os eventos são despachados para as filas apropriadas do **BullMQ** (ex: `relatorios-fila` e `ploomes-fila`).
- Após o enfileiramento bem-sucedido, o evento é marcado como `processado` no banco.
- Caso o redis fique fora do ar temporariamente, os eventos continuam gravados no banco, aumentando a resiliência (*At-Least-Once Delivery*).
