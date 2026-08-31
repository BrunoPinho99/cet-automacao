-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "razao_social" VARCHAR(255),
    "nome_fantasia" VARCHAR(255),
    "cnae_informado" VARCHAR(10),
    "atividade_real" VARCHAR(255),
    "cidade" VARCHAR(100),
    "uf" CHAR(2),
    "trabalhadores_proprios" INTEGER NOT NULL DEFAULT 0,
    "trabalhadores_terceiros" INTEGER NOT NULL DEFAULT 0,
    "unidades" INTEGER NOT NULL DEFAULT 1,
    "estados_atendidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grau_risco" INTEGER,
    "cliente_atual" BOOLEAN NOT NULL DEFAULT false,
    "ploomes_id" VARCHAR(100),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT,
    "nome" VARCHAR(255) NOT NULL,
    "cargo" VARCHAR(100),
    "telefone_e164" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "canal_preferido" VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT,
    "contato_id" TEXT NOT NULL,
    "canal" VARCHAR(20) NOT NULL,
    "campanha" VARCHAR(100),
    "palavra_chave" VARCHAR(100),
    "primeira_intencao" VARCHAR(500),
    "atendente_id" TEXT,
    "protocolo" VARCHAR(30) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimentos" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT,
    "contato_id" TEXT NOT NULL,
    "versao_texto" VARCHAR(50) NOT NULL,
    "texto_hash" VARCHAR(64) NOT NULL,
    "aceito_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(45),
    "user_agent" TEXT,
    "finalidade" TEXT NOT NULL,

    CONSTRAINT "consentimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'iniciada',
    "token_retomada" TEXT NOT NULL,
    "respostas" JSONB NOT NULL DEFAULT '{}',
    "bloco_atual" INTEGER NOT NULL DEFAULT 1,
    "concluida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_declarados" (
    "id" TEXT NOT NULL,
    "ficha_id" TEXT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "possui" VARCHAR(10) NOT NULL,
    "data_emissao" TIMESTAMP(3),
    "data_vencimento" TIMESTAMP(3),
    "arquivo_id" TEXT,

    CONSTRAINT "documentos_declarados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT,
    "ficha_id" TEXT,
    "nome" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(100) NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "status_antivirus" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "enviado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores_comerciais" (
    "id" TEXT NOT NULL,
    "ficha_id" TEXT NOT NULL,
    "porte_unidades" INTEGER NOT NULL DEFAULT 0,
    "complexidade" INTEGER NOT NULL DEFAULT 0,
    "urgencia" INTEGER NOT NULL DEFAULT 0,
    "potencial" INTEGER NOT NULL DEFAULT 0,
    "qualidade_dados" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "faixa" VARCHAR(20) NOT NULL,
    "versao_regras" VARCHAR(50) NOT NULL,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_comerciais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores_sst" (
    "id" TEXT NOT NULL,
    "ficha_id" TEXT NOT NULL,
    "por_eixo" JSONB NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "classificacao" VARCHAR(30) NOT NULL,
    "itens_nao_aplicaveis" JSONB NOT NULL DEFAULT '[]',
    "versao_regras" VARCHAR(50) NOT NULL,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_sst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotas" (
    "id" TEXT NOT NULL,
    "ficha_id" TEXT NOT NULL,
    "rota" CHAR(1) NOT NULL,
    "rota_completa" VARCHAR(20) NOT NULL,
    "gatilho_critico" BOOLEAN NOT NULL DEFAULT false,
    "motivos" JSONB NOT NULL,
    "sla_minutos" INTEGER NOT NULL,
    "responsavel_id" TEXT,
    "definida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "produto" VARCHAR(20) NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'criado',
    "asaas_customer_id" VARCHAR(100),
    "asaas_payment_id" VARCHAR(100),
    "checkout_url" TEXT,
    "idempotency_key" VARCHAR(100) NOT NULL,
    "pago_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "arquivo_pdf_key" VARCHAR(500) NOT NULL,
    "hash_conteudo" VARCHAR(64) NOT NULL,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entregue_em" TIMESTAMP(3),
    "canal_entrega" VARCHAR(50),

    CONSTRAINT "relatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negocios" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "etapa_funil" VARCHAR(100) NOT NULL,
    "valor_estimado" INTEGER,
    "vendedor_id" TEXT,
    "responsavel_tecnico_id" TEXT,
    "ploomes_deal_id" VARCHAR(100),
    "proxima_acao" TEXT,
    "prazo_sla" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negocios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "direcao" VARCHAR(10) NOT NULL,
    "canal" VARCHAR(20) NOT NULL,
    "wamid" VARCHAR(200),
    "template" VARCHAR(100),
    "conteudo" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "papel" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regras_config" (
    "id" TEXT NOT NULL,
    "chave" VARCHAR(100) NOT NULL,
    "valor" JSONB NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "alterado_por" TEXT,
    "alterado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regras_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "entidade" VARCHAR(100) NOT NULL,
    "entidade_id" VARCHAR(100) NOT NULL,
    "acao" VARCHAR(50) NOT NULL,
    "antes" JSONB,
    "depois" JSONB,
    "usuario_id" TEXT,
    "ip" VARCHAR(45),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "event_id" TEXT NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "processado_em" TIMESTAMP(3),
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "webhooks_recebidos" (
    "id" TEXT NOT NULL,
    "origem" VARCHAR(50) NOT NULL,
    "assinatura" TEXT,
    "payload_hash" VARCHAR(64) NOT NULL,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_recebidos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE INDEX "empresas_cnpj_idx" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "contatos_telefone_e164_key" ON "contatos"("telefone_e164");

-- CreateIndex
CREATE INDEX "contatos_telefone_e164_idx" ON "contatos"("telefone_e164");

-- CreateIndex
CREATE INDEX "contatos_empresa_id_idx" ON "contatos"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_protocolo_key" ON "leads"("protocolo");

-- CreateIndex
CREATE INDEX "leads_protocolo_idx" ON "leads"("protocolo");

-- CreateIndex
CREATE INDEX "leads_empresa_id_idx" ON "leads"("empresa_id");

-- CreateIndex
CREATE INDEX "leads_contato_id_idx" ON "leads"("contato_id");

-- CreateIndex
CREATE INDEX "consentimentos_contato_id_idx" ON "consentimentos"("contato_id");

-- CreateIndex
CREATE UNIQUE INDEX "fichas_token_retomada_key" ON "fichas"("token_retomada");

-- CreateIndex
CREATE INDEX "fichas_lead_id_idx" ON "fichas"("lead_id");

-- CreateIndex
CREATE INDEX "fichas_token_retomada_idx" ON "fichas"("token_retomada");

-- CreateIndex
CREATE INDEX "documentos_declarados_ficha_id_idx" ON "documentos_declarados"("ficha_id");

-- CreateIndex
CREATE INDEX "arquivos_empresa_id_idx" ON "arquivos"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_comerciais_ficha_id_key" ON "scores_comerciais"("ficha_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_sst_ficha_id_key" ON "scores_sst"("ficha_id");

-- CreateIndex
CREATE UNIQUE INDEX "rotas_ficha_id_key" ON "rotas"("ficha_id");

-- CreateIndex
CREATE INDEX "rotas_rota_completa_idx" ON "rotas"("rota_completa");

-- CreateIndex
CREATE INDEX "rotas_gatilho_critico_idx" ON "rotas"("gatilho_critico");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_asaas_payment_id_key" ON "pedidos"("asaas_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_idempotency_key_key" ON "pedidos"("idempotency_key");

-- CreateIndex
CREATE INDEX "pedidos_lead_id_idx" ON "pedidos"("lead_id");

-- CreateIndex
CREATE INDEX "pedidos_status_idx" ON "pedidos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_pedido_id_key" ON "relatorios"("pedido_id");

-- CreateIndex
CREATE INDEX "negocios_empresa_id_idx" ON "negocios"("empresa_id");

-- CreateIndex
CREATE INDEX "negocios_etapa_funil_idx" ON "negocios"("etapa_funil");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_wamid_key" ON "mensagens"("wamid");

-- CreateIndex
CREATE INDEX "mensagens_lead_id_idx" ON "mensagens"("lead_id");

-- CreateIndex
CREATE INDEX "mensagens_wamid_idx" ON "mensagens"("wamid");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "regras_config_chave_idx" ON "regras_config"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "regras_config_chave_versao_key" ON "regras_config"("chave", "versao");

-- CreateIndex
CREATE INDEX "auditoria_entidade_entidade_id_idx" ON "auditoria"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "domain_events_status_criado_em_idx" ON "domain_events"("status", "criado_em");

-- CreateIndex
CREATE INDEX "domain_events_tipo_idx" ON "domain_events"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_recebidos_payload_hash_key" ON "webhooks_recebidos"("payload_hash");

-- CreateIndex
CREATE INDEX "webhooks_recebidos_payload_hash_idx" ON "webhooks_recebidos"("payload_hash");

-- AddForeignKey
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_atendente_id_fkey" FOREIGN KEY ("atendente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimentos" ADD CONSTRAINT "consentimentos_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_declarados" ADD CONSTRAINT "documentos_declarados_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "fichas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_declarados" ADD CONSTRAINT "documentos_declarados_arquivo_id_fkey" FOREIGN KEY ("arquivo_id") REFERENCES "arquivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores_comerciais" ADD CONSTRAINT "scores_comerciais_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "fichas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores_sst" ADD CONSTRAINT "scores_sst_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "fichas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "fichas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
