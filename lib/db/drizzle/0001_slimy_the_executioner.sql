CREATE TABLE "client_sessions" (
	"token" varchar(128) PRIMARY KEY NOT NULL,
	"cliente_user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atendimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer,
	"cliente_nome" text NOT NULL,
	"cliente_telefone" text NOT NULL,
	"data" text NOT NULL,
	"hora_inicio" text NOT NULL,
	"observacao" text,
	"pacote_cliente_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anamnese_consentimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"termo_texto" text NOT NULL,
	"assinatura_url" text,
	"aceito" boolean DEFAULT false NOT NULL,
	"ip_address" text,
	"aceito_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anamnese_fotos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"tipo" text DEFAULT 'antes' NOT NULL,
	"foto_url" text NOT NULL,
	"descricao" text,
	"procedimento" text,
	"grupo_id" text,
	"data_registro" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens_sugeridas" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"agendamento_id" integer,
	"cliente_id" integer,
	"modelo_padrao_id" integer,
	"contexto" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"conteudo_sugerido" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"dedupe_key" text NOT NULL,
	CONSTRAINT "mensagens_sugeridas_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "trial_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_by_admin_id" integer NOT NULL,
	"trial_days" integer DEFAULT 7 NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"used_by_email" text,
	"used_by_user_id" integer,
	"used_by_barbearia_id" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trial_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "campaign_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"session_id" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"fbclid" text,
	"gclid" text,
	"referrer" text,
	"landing_page" text,
	"page_path" text,
	"value_cents" bigint,
	"currency" text,
	"barbearia_id" integer,
	"ip_address" text,
	"user_agent" text,
	"capi_status" text,
	"capi_error" text,
	"has_email" boolean,
	"has_phone" boolean,
	"has_fbp" boolean,
	"has_fbc" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaign_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer,
	"email" text NOT NULL,
	"nome" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"brevo_message_id" text,
	"unsubscribe_token" text,
	"enviado_em" timestamp,
	"entregue_em" timestamp,
	"aberto_em" timestamp,
	"erro" text
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"autor_user_id" integer,
	"assunto" text NOT NULL,
	"corpo" text NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"total_destinatarios" integer DEFAULT 0 NOT NULL,
	"total_enviados" integer DEFAULT 0 NOT NULL,
	"total_entregues" integer DEFAULT 0 NOT NULL,
	"total_abertos" integer DEFAULT 0 NOT NULL,
	"total_falhas" integer DEFAULT 0 NOT NULL,
	"filtros" jsonb,
	"criada_em" timestamp DEFAULT now() NOT NULL,
	"enviada_em" timestamp,
	"finalizada_em" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_daily_quota" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"data" text NOT NULL,
	"modo" text NOT NULL,
	"usado" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asaas_contas" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"ambiente" text DEFAULT 'sandbox' NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"wallet_id" text,
	"account_name" text,
	"account_email" text,
	"account_cpf_cnpj" text,
	"webhook_token" text NOT NULL,
	"webhook_configured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'ativo' NOT NULL,
	"ultima_validacao" timestamp,
	"ultimo_erro" text,
	"split_opt_in" boolean DEFAULT false NOT NULL,
	"split_percentual_plataforma" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asaas_contas_barbearia_id_unique" UNIQUE("barbearia_id")
);
--> statement-breakpoint
CREATE TABLE "asaas_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"asaas_conta_id" integer,
	"evento" text NOT NULL,
	"payment_id" text,
	"subscription_id" text,
	"dedupe_key" text,
	"payload" jsonb NOT NULL,
	"processado_em" timestamp,
	"erro" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assinaturas_asaas" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"asaas_customer_id" text NOT NULL,
	"asaas_subscription_id" text NOT NULL,
	"plano" text NOT NULL,
	"periodo" text DEFAULT 'mensal' NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"billing_type" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"proximo_vencimento" text,
	"cancela_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assinaturas_asaas_barbearia_id_unique" UNIQUE("barbearia_id")
);
--> statement-breakpoint
CREATE TABLE "pagamentos_asaas" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer,
	"tipo" text NOT NULL,
	"ref_type" text,
	"ref_id" integer,
	"asaas_payment_id" text NOT NULL,
	"asaas_customer_id" text,
	"asaas_subscription_id" text,
	"billing_type" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"valor_liquido" numeric(10, 2),
	"status" text DEFAULT 'PENDING' NOT NULL,
	"description" text,
	"pix_qr_code_base64" text,
	"pix_copy_paste" text,
	"pix_expira_em" timestamp,
	"bank_slip_url" text,
	"invoice_url" text,
	"due_date" text,
	"paid_at" timestamp,
	"payer_nome" text,
	"payer_cpf_cnpj" text,
	"payer_email" text,
	"payer_telefone" text,
	"split_json" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "apple_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utm_term" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fbclid" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gclid" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "landing_page" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "revenuecat_customer_id" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "iap_status" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "iap_product_id" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "iap_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "email_marketing_ativado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "utm_term" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "fbclid" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "gclid" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "landing_page" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "pre_pagamento_ativo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "pix_chave" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "pix_titular" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "pix_cidade" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "sinal_modo" text DEFAULT 'percentual' NOT NULL;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "sinal_valor" numeric(10, 2) DEFAULT '30' NOT NULL;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "sinal_tolerancia_min" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "sinal_politica_texto" text;--> statement-breakpoint
ALTER TABLE "barbearias" ADD COLUMN "modo_humano" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "asaas_wallet_id" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "asaas_split_percentual" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "sinal_modo_override" text;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "sinal_valor_override" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "alergias" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "contraindicacoes" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "email_marketing_optout" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "email_marketing_optout_at" timestamp;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "email_marketing_optout_token" text;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "atendimento_id" integer;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_status" text DEFAULT 'nao_aplicavel' NOT NULL;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_valor_devido" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_valor_pago" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_informado_em" timestamp;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_confirmado_em" timestamp;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_expira_em" timestamp;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_comprovante_url" text;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "sinal_asaas_payment_id" text;--> statement-breakpoint
ALTER TABLE "comandas" ADD COLUMN "cupom_id" integer;--> statement-breakpoint
ALTER TABLE "comandas" ADD COLUMN "cupom_desconto" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "comandas" ADD COLUMN "asaas_payment_id" text;--> statement-breakpoint
ALTER TABLE "convites" ADD COLUMN "profissional_id" integer;--> statement-breakpoint
ALTER TABLE "anamnese_clientes" ADD COLUMN "observacoes" text;--> statement-breakpoint
ALTER TABLE "anamnese_clientes" ADD COLUMN "preenchido_por" text;--> statement-breakpoint
ALTER TABLE "mensagens_padrao" ADD COLUMN "categoria" text DEFAULT 'outro' NOT NULL;--> statement-breakpoint
ALTER TABLE "mensagens_padrao" ADD COLUMN "favorito" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mensagens_padrao" ADD COLUMN "arquivado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_consentimentos" ADD CONSTRAINT "anamnese_consentimentos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_consentimentos" ADD CONSTRAINT "anamnese_consentimentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_fotos" ADD CONSTRAINT "anamnese_fotos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_fotos" ADD CONSTRAINT "anamnese_fotos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_sugeridas" ADD CONSTRAINT "mensagens_sugeridas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_sugeridas" ADD CONSTRAINT "mensagens_sugeridas_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_sugeridas" ADD CONSTRAINT "mensagens_sugeridas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_sugeridas" ADD CONSTRAINT "mensagens_sugeridas_modelo_padrao_id_mensagens_padrao_id_fk" FOREIGN KEY ("modelo_padrao_id") REFERENCES "public"."mensagens_padrao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_links" ADD CONSTRAINT "trial_links_created_by_admin_id_super_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."super_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_links" ADD CONSTRAINT "trial_links_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_links" ADD CONSTRAINT "trial_links_used_by_barbearia_id_barbearias_id_fk" FOREIGN KEY ("used_by_barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_autor_user_id_users_id_fk" FOREIGN KEY ("autor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_daily_quota" ADD CONSTRAINT "email_daily_quota_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asaas_contas" ADD CONSTRAINT "asaas_contas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asaas_webhook_events" ADD CONSTRAINT "asaas_webhook_events_asaas_conta_id_asaas_contas_id_fk" FOREIGN KEY ("asaas_conta_id") REFERENCES "public"."asaas_contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas_asaas" ADD CONSTRAINT "assinaturas_asaas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos_asaas" ADD CONSTRAINT "pagamentos_asaas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_sessions_user_id_idx" ON "client_sessions" USING btree ("cliente_user_id");--> statement-breakpoint
CREATE INDEX "client_sessions_expires_at_idx" ON "client_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "campaign_events_tipo_idx" ON "campaign_events" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "campaign_events_session_idx" ON "campaign_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "campaign_events_created_at_idx" ON "campaign_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "campaign_events_utm_source_idx" ON "campaign_events" USING btree ("utm_source");--> statement-breakpoint
CREATE INDEX "campaign_events_capi_status_idx" ON "campaign_events" USING btree ("capi_status");--> statement-breakpoint
CREATE UNIQUE INDEX "email_daily_quota_unq" ON "email_daily_quota" USING btree ("barbearia_id","data","modo");--> statement-breakpoint
CREATE UNIQUE INDEX "asaas_webhook_dedupe_unique_idx" ON "asaas_webhook_events" USING btree ("asaas_conta_id","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "pagamentos_asaas_payment_id_idx" ON "pagamentos_asaas" USING btree ("asaas_payment_id");--> statement-breakpoint
CREATE INDEX "pagamentos_asaas_barb_tipo_idx" ON "pagamentos_asaas" USING btree ("barbearia_id","tipo");--> statement-breakpoint
CREATE INDEX "pagamentos_asaas_ref_idx" ON "pagamentos_asaas" USING btree ("ref_type","ref_id");--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_cupom_id_cupons_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convites_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE no action ON UPDATE no action;