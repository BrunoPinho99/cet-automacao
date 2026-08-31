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
