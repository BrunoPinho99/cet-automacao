# PLANO.md — Automação Comercial e Diagnóstico SST da CET

## 1. Decisões de Arquitetura
A arquitetura foi desenhada para garantir resiliência, escalabilidade e manutenibilidade, isolando responsabilidades em um monorepo gerido pelo pnpm.

**Stack Tecnológica:**
* **Backend:** Node.js 20 LTS, NestJS (módulos, DI, guards RBAC).
* **Banco de Dados:** PostgreSQL 16 + Prisma (Migrations versionadas).
* **Mensageria e Filas:** BullMQ + Redis (retentativas exponenciais, dead-letter queues).
* **Frontend:** Next.js 14 (App Router) + Tailwind CSS (Duas aplicações: `portal` e `admin`).
* **Testes:** Vitest (unidade/integração) e Playwright (E2E).
* **Geração de PDF:** Puppeteer renderizando templates HTML.
* **Infraestrutura Local:** Docker Compose (postgres, redis, mailhog).

**Divergências Deliberadas (conforme especificação):**
1. **n8n fora do caminho crítico:** O n8n foi removido da orquestração core (dinheiro/liberação técnica) em favor da própria API com BullMQ. Isso garante testabilidade, idempotência e controle de falhas (rollback) que fluxos visuais dificultam. O n8n fica restrito a automações periféricas.
2. **PostgreSQL como Fonte da Verdade:** O CRM (Ploomes) não é a fonte primária. O Postgres detém o estado real do lead e pagamentos; o Ploomes funciona como um espelho assíncrono alimentado via filas, garantindo que o atendimento não pare caso o CRM fique indisponível.
3. **Idempotência como Primeira Classe:** A arquitetura será guiada a eventos (Outbox Pattern na tabela `domain_events`). Todo processamento de webhook usa chaves de idempotência, garantindo que eventos duplicados não gerem efeitos colaterais repetidos (ex: um pagamento libera um único relatório).

## 2. Modelo de Dados (Entidades Principais)
O banco não armazenará dados de prontuário, exames ou aptidão individual. As entidades focam na orquestração comercial e conformidade documental:
* `empresa`: cnpj (único), razao_social, trabalhadores, unidades, etc.
* `contato`: empresa_id, telefone_e164 (único), email.
* `lead`: protocolo único, canal, intenção, atendente.
* `consentimento`: aceite LGPD com hash e versão.
* `ficha`: status, token_retomada, bloco_atual, respostas (jsonb).
* `documento_declarado` e `arquivo`: controle de PDFs enviados.
* `score_comercial` e `score_sst`: cálculos do motor de regras.
* `rota`: A (Estratégica), B (Crescimento), C (Digital).
* `pedido`: integração Asaas, valor, status, idempotency_key.
* `relatorio`: pdf gerado e histórico de entrega.
* `negocio`: espelho do Ploomes (etapa de funil, SLAs).
* `mensagem`: log do WhatsApp/Instagram.
* `usuario`, `regra_config` (parametrizável), `auditoria`, `domain_events` (outbox), `webhook_recebido`.

## 3. Fases de Implementação
O projeto será desenvolvido rigorosamente nas seguintes fases, com portões de verificação (Testes) antes de qualquer avanço:
* **Fase 1 — Fundação:** Monorepo, Docker Compose, Prisma Schema, Seeds e CI (lint/testes).
* **Fase 2 — Motor de Regras:** `packages/core` com lógica pura (TDD) para rotas, score e encaminhamento.
* **Fase 3 — Ficha e Portal:** Next.js `portal` com ficha progressiva mobile-first, retomada de sessão e uploads.
* **Fase 4 — Canais:** Webhooks Meta, menu, templates e transbordo para humanos.
* **Fase 5 — Pagamento:** Integração Asaas, travas financeiras rígidas e idempotência.
* **Fase 6 — CRM, Relatório e Painéis:** Sincronia Ploomes (filas), geração de PDF (Puppeteer) e Next.js `admin`.
* **Fase 7 — Piloto:** Script de stress test com 100 jornadas simuladas com injeção de falhas para testar filas.

## 4. Riscos
1. **Idempotência de Webhooks:** Alta criticidade. Risco de cobrança/liberação dupla mitigado pela implementação de `webhook_recebido` e travas no Prisma.
2. **Manutenção do Puppeteer:** Geração de PDFs complexos pode gargalar o Node. Mitigado executando a geração de relatório em *background jobs* (BullMQ).
3. **Complexidade do Score:** As matrizes de SST possuem dezenas de cenários (Conforme/Não Conforme/Provisório/NA). Mitigado com isolamento do `packages/core` e >90% de cobertura de testes.

## 5. Fora do Escopo do MVP
- Assinatura eletrônica de contratos.
- Emissão de Nota Fiscal (NFe).
- Integrações com softwares ocupacionais (ESO/SOC/MedNet).
- Aplicativo Nativo (iOS/Android).
- Chat de IA Generativa para cliente final.
- Portal do cliente com sistema de login (a jornada usa `token_retomada`).
