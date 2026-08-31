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

# 5. Suba todos os apps em modo desenvolvimento
pnpm dev
```

## Apps disponíveis

| App | URL | Descrição |
|-----|-----|-----------|
| `apps/portal` | http://localhost:3000 | Ficha pública de coleta |
| `apps/api` | http://localhost:3001 | API NestJS |
| `apps/admin` | http://localhost:3002 | Painel interno |
| Mailhog | http://localhost:8025 | Caixa de e-mails de dev |

## Comandos úteis

```bash
# Testar todos os pacotes
pnpm test

# Typecheck completo
pnpm typecheck

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
- [`ARQUITETURA.md`](./ARQUITETURA.md) — Diagrama de eventos
- [`RUNBOOK.md`](./RUNBOOK.md) — O que fazer quando uma integração cair

## Stack

- **API:** NestJS + TypeScript
- **Banco:** PostgreSQL 16 + Prisma
- **Filas:** BullMQ + Redis
- **Frontend:** Next.js 14 (App Router)
- **Testes:** Vitest + Playwright
- **PDF:** Puppeteer
- **Infra local:** Docker Compose
