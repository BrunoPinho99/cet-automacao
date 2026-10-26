# Manual de Operação do Sistema CET — Gestão Comercial & SST

Bem-vindo(a) ao Manual Oficial de Operação do **Sistema CET** (Clínica Especializada no Trabalho). Este documento reúne todas as credenciais de acesso, links das áreas do sistema e guias passo a passo para a equipe operacional, comercial e técnica.

---

## 1. Links e Credenciais de Acesso

O sistema está publicado e ativo em produção:

* **Endereço Principal:** [https://cet-automacao.vercel.app](https://cet-automacao.vercel.app)
* **Tela de Login:** [https://cet-automacao.vercel.app/login](https://cet-automacao.vercel.app/login)
* **Painel Administrativo:** [https://cet-automacao.vercel.app/admin](https://cet-automacao.vercel.app/admin)

### Perfis e Logins Pré-Configurados

| Perfil | E-mail de Acesso | Atalho Rápido | Senhas Válidas | Papel / Permissões |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador Geral** | `admin@cet.com.br` | `admin` | `123456` ou `admin123` | Acesso total a todas as telas, relatórios, saúde e reprocessamento |
| **Diretoria (Bruno)** | `bruno@cet.com.br` | `bruno` | `Bruno080299!` ou `123456` | Acesso total de Administrador |
| **Equipe Comercial** | `vendas@cet.com.br` | `vendas` | `123456` | Clientes, Leads, Chat de Atendimento e Painéis |
| **Corpo Técnico / Médico** | `tecnico@cet.com.br` | `tecnico` | `123456` | Validação técnica, emissão de laudos e aprovação de fichas |

> **Dica de agilidade:** No campo de e-mail da tela de login, você não precisa digitar `@cet.com.br`. Basta digitar `admin`, `bruno` ou `vendas` junto com a sua senha para entrar imediatamente.

---

## 2. Mapa dos Módulos do Sistema

```
CET Automação
├── 🌐 Portal Público (https://cet-automacao.vercel.app)
│   ├── Consulta CNPJ / Razão Social na Receita Federal
│   ├── Calculadora de Score SST (NRs e eSocial)
│   └── Checkout Transparente Asaas (PIX / Cartão R$ 19,90)
│
├── 🔐 Painel Administrativo (/admin)
│   ├── 👥 Clientes & Leads (/admin) — CRM, Kanban e Relatório SST
│   ├── 💬 Conversas (/admin/atendimento) — Chat unificado WhatsApp/Instagram
│   ├── 📱 Conectar WhatsApp (/admin/whatsapp) — Pareamento de QR Code
│   ├── 📊 Relatórios & BI (/admin/paineis) — Indicadores e funil comercial
│   ├── ⚡ Status do Sistema (/admin/saude) — Monitoramento de filas e banco
│   └── ⚠️ Envios com Falha (/admin/eventos/mortos) — Reprocessamento de fila
│
└── 📋 Área do Cliente
    ├── 📝 Ficha Técnica Inteligente (/ficha/[token] ou link curto /f/[codigo])
    └── 📂 Portal de Laudos e Documentos (/portal/[token])
```

---

## 3. Passo a Passo Operacional

### 3.1. Como Atender um Cliente no WhatsApp / Instagram
1. Acesse o menu lateral e clique em **Conversas** (`/admin/atendimento`).
2. Na lista à esquerda, você verá todos os contatos que enviaram mensagens recentes, com selos identificando a empresa e o canal (WhatsApp ou Instagram).
3. Ao clicar sobre um cliente, o histórico completo da conversa é exibido no centro da tela.
4. **Assumir Atendimento Humano:**
   * Clique no botão **"Assumir Atendimento"**.
   * Ao fazer isso, as respostas automáticas da assistente virtual são pausadas imediatamente para aquele cliente, garantindo que não haja sobreposição de mensagens.
5. Digite sua mensagem no campo inferior e clique em **Enviar** (ou pressione Enter).
6. **Concluir Atendimento:**
   * Quando o atendimento for finalizado, clique em **"Liberar Atendimento"** para devolver o contato ao fluxo automático da clínica.

---

### 3.2. Como Conectar ou Reconectar o WhatsApp da Clínica
1. Acesse **Conectar WhatsApp** (`/admin/whatsapp`).
2. O sistema verificará o status do canal corporativo em tempo real:
   * **Conectado e Operacional (Verde):** O WhatsApp está funcionando normalmente.
   * **Aguardando Leitura do QR Code:** Um QR Code é renderizado na tela.
3. Abra o WhatsApp no celular oficial da clínica:
   * Vá em **Aparelhos Conectados** → **Conectar um Aparelho**.
   * Aponte a câmera do celular para o QR Code na tela do computador.
4. Em instantes a tela atualizará para *Conectado e Operacional*.
5. Se a conexão travar ou o celular perder o sinal:
   * Clique em **"Reiniciar Instância"** para restabelecer a conexão sem perder o histórico.

---

### 3.3. Como Gerenciar Leads e Classificar por Porte da Empresa
1. Acesse a tela inicial de **Clientes** (`/admin`).
2. Os clientes são organizados e sinalizados pelo número de colaboradores:
   * 🔴 **Grande Porte (100+ colaboradores) — Rota A:** Prioridade máxima. SLA de atendimento em até 10 minutos por consultor sênior.
   * 🟡 **Médio Porte (20 a 99 colaboradores) — Rota B:** Atendimento consultivo em até 2 horas.
   * 🟢 **Pequeno Porte (até 19 colaboradores) — Rota C:** Processo guiado pelo portal digital.
3. **Buscar Empresa:** Digite a Razão Social ou CNPJ no campo de busca no topo para filtrar instantaneamente.
4. **Cadastrar Novo Cliente Manualmente:**
   * Clique no botão azul **"+ Novo Cliente"**.
   * Preencha Razão Social, CNPJ, Telefone com DDD e Quantidade de Colaboradores.
   * Clique em **Salvar Cliente**. O lead será inserido no banco de dados e sincronizado.

---

### 3.4. Como Gerar o Relatório Executivo SST em PDF
1. Na lista de **Clientes** (`/admin`), localize a empresa desejada.
2. Clique no card do cliente para abrir os detalhes.
3. Clique no botão **"Visualizar Relatório SST"**.
4. O sistema gera a folha timbrada oficial da CET contendo:
   * Pontuação de Regularidade SST (0 a 100 pontos).
   * Diagnóstico de PGR (NR-01) e PCMSO (NR-07).
   * Situação dos Exames Ocupacionais (ASO).
   * Status de Transmissão ao eSocial (S-2210, S-2220, S-2240).
   * Valores estimados de multas evitadas perante a Portaria MTP 672.
5. Clique em **"Imprimir / Salvar em PDF"** para enviar diretamente ao empresário ou contador.

---

### 3.5. Como Acompanhar o Status do Sistema e Filas
1. Acesse **Status do Sistema** (`/admin/saude`).
2. Esta tela exibe a saúde de toda a infraestrutura:
   * **Banco de Dados (PostgreSQL / Supabase):** Conectividade e latência.
   * **Fila de Relatórios:** Trabalhos em espera, em execução e finalizados.
   * **Fila do CRM Ploomes:** Sincronização assíncrona de negócios.
   * **Eventos Pendentes e Mortos (Dead-Letter):** Notifica se algum webhook não pôde ser entregue.
3. Caso existam falhas acumuladas, acesse **Envios com Falha** (`/admin/eventos/mortos`) e clique em **"Reprocessar Evento"** para reenviar a mensagem ou relatório com 1 clique.

---

## 4. Política de Privacidade e Boas Práticas (LGPD)

> **Proteção de Dados Médicos Sensíveis:**
> O sistema comercial da CET **NÃO** armazena prontuários médicos individuais, diagnósticos clínicos ou fichas médicas de trabalhadores. Os dados coletados são estritamente cadastrais e corporativos (CNPJ, Razão Social, número de funcionários e situação de conformidade documental perante o Ministério do Trabalho).
