# Entregas do MVP — Automação Comercial e Diagnóstico SST da CET

Este documento consolida tudo o que foi implementado e entregue durante o desenvolvimento do MVP (Produto Mínimo Viável) do sistema de automação da CET.

## 1. Arquitetura e Infraestrutura
A base do sistema foi construída visando escalabilidade e resiliência:
- **Monorepo (pnpm + Turborepo):** Estrutura organizada com separação clara de responsabilidades (ex: `apps/web` e `packages/core`).
- **Backend/Frontend unificado:** Utilização do Next.js 15 (App Router) para servir tanto as interfaces web quanto as rotas de API.
- **Banco de Dados (PostgreSQL + Prisma):** Modelagem completa das entidades principais (empresa, lead, ficha, negócio, pedido) com foco no Postgres como a fonte única da verdade.
- **Mensageria e Filas (BullMQ + Redis):** Sistema de filas configurado com retentativas exponenciais e DLQ (Fila Morta) para processos assíncronos e integrações, evitando que a aplicação trave em momentos de instabilidade externa.
- **Ambiente Local:** Configuração de Docker Compose contendo Postgres, Redis e Mailhog para desenvolvimento e testes consistentes.

## 2. Motor de Regras (`packages/core`)
Foi construído um módulo isolado para lidar com toda a lógica complexa de negócios:
- **Motor de Score Comercial e SST:** Regras paramétricas para avaliar dezenas de cenários de SST (Conforme, Não Conforme, Provisório, NA).
- **Roteamento de Leads:** Lógica que direciona o lead para a rota adequada (Rota A, B ou C) com base no seu diagnóstico.
- **Testabilidade:** Módulo isolado, permitindo altíssima cobertura de testes unitários (utilizando Vitest).

## 3. Jornada do Cliente e Portal (`apps/web`)
Desenvolvimento das interfaces essenciais e gestão de fluxo de usuário:
- **Ficha Progressiva (Mobile-First):** Coleta de dados passo a passo com design voltado para dispositivos móveis.
- **Retomada de Sessão:** Sistema de `token_retomada` que permite ao lead parar no meio da ficha e continuar depois, sem perder o progresso ou duplicar dados.
- **Gestão de Arquivos:** Upload de arquivos e documentos exigidos.
- **Consentimento LGPD:** Aceite e versionamento do consentimento do lead.

## 4. Orquestração e Integrações
Toda a parte de comunicação com sistemas externos foi estruturada priorizando estabilidade:
- **Padrão Transactional Outbox:** Utilização da tabela `domain_events` para garantir a entrega de mensagens (Ploomes, Webhooks) sem duplicidade, alcançando 100% de estabilidade na orquestração central.
- **Webhooks Meta/Canais:** Recepção estruturada de webhooks (WhatsApp/Instagram), com checagem de redundância e chaves de idempotência para evitar ações repetidas.
- **Integração de Pagamento (Asaas):** Processamento de cobranças (pedidos), com gestão do status financeiro e proteção contra duplicidade.
- **Geração de PDF (Puppeteer):** Geração e entrega do relatório em segundo plano (*background jobs*), protegendo a performance do sistema principal.

## 5. Testes e Qualidade
O projeto possui forte cobertura de qualidade, com portões de verificação em cada fase:
- **Testes Unitários e de Integração:** Implementados e validados no núcleo de lógica e fluxos principais.
- **Testes E2E:** Simulação de fluxos reais do usuário utilizando Playwright.
- **Piloto e Teste de Estresse:** Um simulador (`piloto-simulacao.ts`) validou 100 jornadas simultâneas com sucesso. O sistema demonstrou 100% de taxa de conclusão e total recuperação nas injeções de falha planejadas (queda do Ploomes, instabilidade do Redis, duplicidade de webhooks).

---
**Status Final:** A fundação do MVP está concluída e, conforme o "Relatório do Piloto", a arquitetura foi testada exaustivamente e validada como **sólida para produção inicial**.
