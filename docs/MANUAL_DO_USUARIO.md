# 📘 Manual de Operação do Sistema — CET Automação

Bem-vindo ao manual oficial de operação da plataforma **CET Automação**. Este guia detalha as credenciais de acesso, os perfis de permissão, os fluxos de trabalho e a operação de cada módulo do sistema.

---

## 🔑 1. Credenciais e Logins Disponíveis

A plataforma conta com autenticação segura via Argon2id e controle de acesso baseado em funções (RBAC). 

Acesse a tela de login em:  
👉 **[https://cet-automacao.vercel.app/login](https://cet-automacao.vercel.app/login)**

### Tabela de Usuários e Senhas

| Nome | E-mail / Usuário | Papel / Perfil | Senhas Aceitas | Permissões |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador Geral** | `admin@cet.com.br` *(ou apenas `admin`)* | `admin` | `Bruno080299!`<br>`Cet@2026!Dev`<br>`admin123` | **Acesso Total:** Gestão de leads, edição de regras, auditoria, monitoramento de saúde do sistema e eventos mortos. |
| **Bruno Pinho (Admin)** | `bruno@cet.com.br` *(ou apenas `bruno`)* | `admin` | `Bruno080299!` | **Acesso Total:** Super Administrador com privilégios completos. |
| **Equipe Comercial** | `vendas@cet.com.br` *(ou apenas `vendas`)* | `comercial` | `Bruno080299!`<br>`Cet@2026!Dev`<br>`123456` | **Atendimento e Vendas:** Visualização e gestão de leads, acompanhamento da Ficha Inteligente, contato com clientes categorizados por Porte da Empresa (Grande, Médio e Pequeno porte). |

> 💡 **Dica de Usabilidade:** No campo de e-mail da tela de login, você não precisa digitar `@cet.com.br`. Basta digitar `admin`, `vendas` ou `bruno` que o sistema autocompleta automaticamente!

---

## 🗺️ 2. Módulos do Sistema e Navegação

A interface adota a estética **SaaS 2026** nas cores institucionais **branco e azul**, com cabeçalho contendo a logomarca oficial da CET, layout 100% responsivo para computadores e celulares, e livre de jargões técnicos ou aparências de inteligência artificial genérica.

### 1. Painel Administrativo / Dashboard Geral
- **URL:** [`/admin`](https://cet-automacao.vercel.app/admin) (ou [`/painel`](https://cet-automacao.vercel.app/painel))
- **O que faz:** Exibe o panorama consolidado do dia:
  - Total de novos clientes e contatos recebidos;
  - Diagnósticos em andamento vs concluídos;
  - Clientes estratégicos de **Grande Porte** (antiga Rota A) com SLA prioritário de 10 minutos;
  - Faturamento preliminar (Diagnóstico Completo R$ 19,90).

### 2. Central de Atendimento & Gestão de Leads (CRUD)
- **URL:** [`/admin/atendimento`](https://cet-automacao.vercel.app/admin/atendimento)
- **O que faz:** Centro operacional da equipe:
  - **Listagem Completa:** Visualiza todos os leads gerados via WhatsApp, Instagram ou formulário Web.
  - **Filtros e Busca em Tempo Real:** Pesquise por Razão Social, Nome Fantasia, CNPJ, Protocolo ou Telefone.
  - **Criar Lead Manualmente:** Permite cadastrar novos clientes recebidos por telefone fixo ou presencialmente.
  - **Editar / Atualizar:** Edição de dados cadastrais da empresa (porte, funcionários, grau de risco) e do contato.
  - **Copiar Link da Ficha:** Botão para copiar o link direto da Ficha Inteligente para enviar ao cliente no WhatsApp.
  - **Liberar Diagnóstico / Concluir:** Transição manual de status com registro de auditoria.

### 3. Monitoramento de Saúde da Infraestrutura
- **URL:** [`/admin/saude`](https://cet-automacao.vercel.app/admin/saude)
- **O que faz:** Monitora em tempo real:
  - Conexão e latência do banco de dados **PostgreSQL**;
  - Conexão e filas do **Redis**;
  - Status dos processos em background (`cet-worker`);
  - Conectividade dos Webhooks do **Asaas** e **WhatsApp**.

### 4. Dead Letter Queue (Fila de Eventos Mortos)
- **URL:** [`/admin/eventos/mortos`](https://cet-automacao.vercel.app/admin/eventos/mortos)
- **O que faz:** Se algum evento falhar (ex: queda momentânea de conexão ao emitir PDF ou webhook externo), o evento é preservado aqui com stack trace e botão de **Reprocessar com 1 Clique**.

---

## 🔄 3. Passo a Passo dos Fluxos Principais

### Fluxo 1: Atendimento via WhatsApp / Instagram (Assistente Digital)
1. **Gatilho de Ativação:** O robô só é ativado se a mensagem contiver saudações amigáveis (*oi, olá, bom dia, boa tarde...*), termos comerciais/SST (*orçamento, proposta, PGR, PCMSO, ASO, eSocial, laudo...*) ou números diretos de 1 a 6. Mensagens aleatórias, spam, stickers ou áudios avulsos não ativam o bot, evitando conversas desnecessárias.
2. A assistente envia a **Abertura Humanizada com Consentimento LGPD e Opções Numéricas**:
   > *"Olá! Tudo bem? Seja muito bem-vindo(a) à CET – Segurança e Medicina do Trabalho! 😊
   >
   > Estou aqui para te ajudar e agilizar o seu atendimento.
   >
   > Por favor, digite o número da opção que melhor descreve o que você precisa hoje:
   > 
   > 1 - Saber se minha empresa está regular perante o Ministério do Trabalho
   > 2 - Fazer ou renovar documentos de SST (PGR, PCMSO, LTCAT)
   > 3 - Exames ocupacionais e ASO (Admissional, Periódico, Demissional)
   > 4 - Envio de eSocial SST, PPP ou emissão de CAT
   > 5 - Já sou cliente da CET e preciso de suporte
   > 6 - Falar diretamente com um de nossos consultores
   > 
   > _(Ao responder, você autoriza o uso dos dados para atendimento e proposta, conforme a LGPD)._"*
3. O cliente escolhe digitando simplesmente o número correspondente (**1 a 6**):
   - **Opções 1 a 4:** A assistente pede gentilmente o nome completo, cria o Lead, gera o protocolo rastreável e envia o link exclusivo da **Ficha Inteligente** para preenchimento ágil no celular.
   - **Opção 5:** Encaminha com acolhimento para a equipe de suporte ao cliente existente.
   - **Opção 6:** Transfere suavemente para um consultor especialista humano (com protocolo).
4. **Regra de Silêncio do Robô:** Se um atendente humano assumir a conversa no painel ou se for acionado transbordo, o robô permanece 100% em silêncio para não atrapalhar a conversa humana.

### Fluxo 2: Gatilhos Críticos (Grande Porte - Transferência Imediata)
A triagem automática é **direcionada imediatamente** a um consultor sênior (SLA de 10 min) caso:
- A empresa seja classificada como **Grande Porte** (100 ou mais trabalhadores);
- A empresa possua **2 ou mais unidades** ou atue em mais de um estado;
- O cliente mencione **acidente de trabalho, fiscalização, notificação do MTE ou autuação**;
- O cliente informe necessidade técnica de alta complexidade.
- **Mensagem enviada:**
  > *"Pelo porte da empresa, sua análise será personalizada. Um especialista da CET continuará o atendimento. Protocolo: {{protocolo}}."*

### Fluxo 3: Ficha de Diagnóstico & Pagamento Asaas (Médio e Pequeno Porte)
1. O cliente preenche a ficha no navegador (sem necessidade de senha).
2. Ao final, confirma o diagnóstico:
   - **Diagnóstico Completo SST:** Taxa única de R$ 19,90
3. O cliente realiza o pagamento via Checkout Transparente do Asaas (PIX Imediato com QR Code ou Cartão de Crédito).
4. O cliente é informado que:
   > *"O valor pago pode virar crédito integral na contratação de serviços acima de R$ 500 realizados em até 7 dias."*
5. Assim que o webhook do Asaas confirma o pagamento (com garantia de idempotência SHA-256):
   - O worker gera o relatório PDF automaticamente;
   - O cliente recebe no WhatsApp o link do relatório com a mensagem:
     > *"Seu diagnóstico está pronto. Prioridade: {{prioridade}}. A CET pode regularizar e aplicar o crédito previsto. [QUERO RESOLVER] [FALAR COM TÉCNICO]"*

---

## 🔒 4. Regras Inegociáveis de LGPD
- **Nenhum Dado Sensível:** O sistema jamais armazena ou solicita prontuários médicos, resultados de exames individuais ou CID de trabalhadores.
- **Histórico e Auditoria:** Todas as alterações manuais em leads, trocas de status e acessos administrativos são registrados na tabela `Auditoria`.
