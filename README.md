# CET Automação — Sistema de Automação Comercial e Diagnóstico SST

## Subir em uma linha (desenvolvimento local)

```bash
# 1. Instale as dependências
pnpm install

# 2. Copie as variáveis de ambiente
cp infra/.env.example .env
# Edite .env com suas credenciais

# 3. Suba a infraestrutura local (Postgres, Redis, Mailhog)
pnpm docker:up

# 4. Rode as migrations e o seed
pnpm db:migrate
pnpm db:seed

# 5. Suba a aplicação web e API (Next.js 15)
pnpm dev
```

## Estrutura do Monorepo

| Pacote/App | URL / Local | Descrição |
|-----|-----|-----------|
| `apps/web` | http://localhost:3000 | Aplicação unificada Next.js 15 (Portal Ficha, Painel Admin, API Webhooks) |
| `packages/core` | - | Motor de regras (SST, Rota, Comercial) puro em TypeScript |
| `packages/db` | - | Prisma ORM, migrations, schemas do PostgreSQL |
| `packages/shared` | - | Contratos, DTOs e utilitários compartilhados |
| Mailhog | http://localhost:8025 | Caixa de e-mails de dev (Docker) |

## Comandos úteis

```bash
# Testar todos os pacotes
pnpm test

# Typecheck completo
pnpm typecheck

# Lint completo
pnpm lint

# Banco de dados
pnpm db:studio      # Abre Prisma Studio
pnpm db:migrate     # Cria/aplica migrations (dev)
pnpm db:seed        # Popula o banco com dados de teste

# Docker
pnpm docker:up      # Sobe Postgres + Redis + Mailhog
pnpm docker:down    # Derruba containers
```

## Documentação técnica

- [`PLANO.md`](./PLANO.md) — Decisões de arquitetura
- [`DECISOES.md`](./DECISOES.md) — Registro de decisões (ADR)

## Stack

- **Framework:** Next.js 15 (App Router) + Tailwind CSS
- **Banco:** PostgreSQL 16 + Prisma
- **Filas:** BullMQ + Redis
- **Testes:** Vitest + Playwright
- **Infra local:** Docker Compose
