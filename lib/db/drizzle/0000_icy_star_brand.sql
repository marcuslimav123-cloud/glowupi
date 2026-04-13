CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text,
	"google_id" text,
	"telefone" text,
	"foto_url" text,
	"role" text DEFAULT 'dono' NOT NULL,
	"barbearia_id" integer,
	"profissional_id" integer,
	"tema" text DEFAULT 'blue',
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "barbearias" (
	"id" serial PRIMARY KEY NOT NULL,
	"dono_id" integer NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"cnpj" text,
	"telefone" text,
	"email" text,
	"cep" text,
	"logradouro" text,
	"numero" text,
	"bairro" text,
	"cidade" text,
	"uf" text,
	"cor_primaria" text DEFAULT '#3b82f6' NOT NULL,
	"logo_url" text,
	"horario_funcionamento" jsonb,
	"fotos" jsonb DEFAULT '[]'::jsonb,
	"formas_pagamento" jsonb DEFAULT '[]'::jsonb,
	"redes_sociais" jsonb DEFAULT '{}'::jsonb,
	"descricao_publica" text,
	"plano_nome" text DEFAULT 'Trial' NOT NULL,
	"plano_status" text DEFAULT 'ativo' NOT NULL,
	"plano_vencimento" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text DEFAULT 'trial',
	"subscription_plan" text,
	"subscription_period" text,
	"segmentacao" jsonb DEFAULT '{}'::jsonb,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"tutorial_completo" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "barbearias_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profissionais" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"filial_id" integer,
	"usuario_id" integer,
	"nome_exibicao" text NOT NULL,
	"apelido" text,
	"foto_url" text,
	"comissao_tipo" text DEFAULT 'percentual' NOT NULL,
	"comissao_valor" numeric(10, 2) DEFAULT '40' NOT NULL,
	"celular" text,
	"especialidade" text,
	"horarios" jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"filial_id" integer,
	"nome" text NOT NULL,
	"preco" numeric(10, 2) NOT NULL,
	"duracao_minutos" integer DEFAULT 30 NOT NULL,
	"descricao" text,
	"dias_retorno" integer,
	"mensagem_retorno" text,
	"tipo_preco" text DEFAULT 'fixo' NOT NULL,
	"imagem_url" text,
	"disponivel_online" boolean DEFAULT true NOT NULL,
	"fidelidade_ativa" boolean DEFAULT false NOT NULL,
	"pontos_acumular" integer DEFAULT 1,
	"pontos_resgate" integer DEFAULT 10,
	"comissao_porcentagem" numeric(5, 2),
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"aniversario" text,
	"observacoes" text,
	"vip" boolean DEFAULT false NOT NULL,
	"pontos_fidelidade" integer DEFAULT 0 NOT NULL,
	"total_gasto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ultima_visita" text,
	"status" text DEFAULT 'aprovado' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agendamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"filial_id" integer,
	"cliente_id" integer,
	"cliente_nome" text NOT NULL,
	"cliente_telefone" text NOT NULL,
	"profissional_id" integer NOT NULL,
	"profissional_nome" text NOT NULL,
	"servico_id" integer NOT NULL,
	"servico_nome" text NOT NULL,
	"data" text NOT NULL,
	"hora_inicio" text NOT NULL,
	"hora_fim" text NOT NULL,
	"status" text DEFAULT 'confirmado' NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"pago" boolean DEFAULT false NOT NULL,
	"sem_preferencia" boolean DEFAULT false NOT NULL,
	"observacao" text,
	"aniversario" boolean DEFAULT false NOT NULL,
	"vip" boolean DEFAULT false NOT NULL,
	"encaixe" boolean DEFAULT false NOT NULL,
	"pacote_cliente_id" integer,
	"origem" text DEFAULT 'manual',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comandas" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"agendamento_id" integer NOT NULL,
	"cliente_nome" text NOT NULL,
	"profissional_id" integer NOT NULL,
	"profissional_nome" text NOT NULL,
	"data_fechamento" timestamp DEFAULT now() NOT NULL,
	"mes_ano" text NOT NULL,
	"servicos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"produtos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pagamentos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gorjeta" jsonb,
	"tipo_comanda" text DEFAULT 'cliente' NOT NULL,
	"valor_total" numeric(10, 2) NOT NULL,
	"valor_liquido" numeric(10, 2),
	"taxa_cartao" numeric(10, 2),
	"data_compensacao" text,
	"comissao_total" numeric(10, 2) NOT NULL,
	"desconto" numeric(10, 2) DEFAULT '0',
	"desconto_tipo" text DEFAULT 'valor',
	"parcelas" integer DEFAULT 1,
	"status" text DEFAULT 'paga' NOT NULL,
	"observacao" text,
	"cadastrado_por" text,
	"cliente_id" integer,
	"pontos_ganhos" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"preco" numeric(10, 2) NOT NULL,
	"custo" numeric(10, 2),
	"quantidade" integer DEFAULT 0 NOT NULL,
	"quantidade_minima" integer DEFAULT 5 NOT NULL,
	"codigo_barras" text,
	"validade" text,
	"imagem_url" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas_financeiras" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"categoria" text NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"data_vencimento" text NOT NULL,
	"data_pagamento" text,
	"forma_pagamento" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"recorrente" boolean DEFAULT false NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pacotes_cliente" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"pacote_id" integer NOT NULL,
	"cliente_id" integer,
	"cliente_nome" text NOT NULL,
	"sessoes_usadas" integer DEFAULT 0 NOT NULL,
	"sessoes_total" integer NOT NULL,
	"status" text DEFAULT 'ativo' NOT NULL,
	"data_compra" timestamp DEFAULT now() NOT NULL,
	"data_validade" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pacotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"itens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preco" numeric(10, 2) NOT NULL,
	"sessoes_total" integer DEFAULT 1 NOT NULL,
	"validade_dias" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"agendamento_id" integer NOT NULL,
	"cliente_nome" text NOT NULL,
	"profissional_id" integer NOT NULL,
	"profissional_nome" text NOT NULL,
	"nota" integer NOT NULL,
	"comentario" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lista_espera" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_nome" text NOT NULL,
	"cliente_telefone" text NOT NULL,
	"data" text NOT NULL,
	"servico_id" integer,
	"profissional_id" integer,
	"status" text DEFAULT 'aguardando' NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recompensas" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"pontos_necessarios" integer NOT NULL,
	"tipo" text DEFAULT 'servico' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resgates" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"cliente_nome" text NOT NULL,
	"recompensa_id" integer NOT NULL,
	"recompensa_nome" text NOT NULL,
	"pontos_usados" integer NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentacoes_estoque" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"produto_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"quantidade" integer NOT NULL,
	"motivo" text NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text NOT NULL,
	"destinatarios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_envio" timestamp,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"chave" text NOT NULL,
	"valor" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_config_chave_unique" UNIQUE("chave")
);
--> statement-breakpoint
CREATE TABLE "super_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "convites" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'colaborador' NOT NULL,
	"perfil_acesso_id" integer,
	"token" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"nome_convidado" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	CONSTRAINT "convites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "cliente_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text,
	"google_id" text,
	"telefone" text,
	"foto_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cliente_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bloqueios_horario" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"profissional_id" integer NOT NULL,
	"data" text NOT NULL,
	"hora_inicio" text NOT NULL,
	"hora_fim" text NOT NULL,
	"motivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"categoria" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"is_cartao" boolean,
	"multiplicador_pontos" numeric(5, 2),
	"taxa_operadora" numeric(5, 2),
	"tipo_bandeira" text,
	"dias_recebimento" integer,
	"dias_uteis" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"codigo" text NOT NULL,
	"tipo" text DEFAULT 'percentual' NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"validade_inicio" timestamp,
	"validade_fim" timestamp,
	"uso_maximo" integer,
	"uso_atual" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos_clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"filtro_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "noticias" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text NOT NULL,
	"imagem_url" text,
	"grupo_id" integer,
	"publicado_em" timestamp,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lembretes_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"intervalo_dias" integer NOT NULL,
	"mensagem_template" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assinantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer,
	"cliente_nome" text NOT NULL,
	"plano_id" integer NOT NULL,
	"plano_nome" text NOT NULL,
	"status" text DEFAULT 'ativo' NOT NULL,
	"data_inicio" timestamp DEFAULT now() NOT NULL,
	"data_fim" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planos_assinatura" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_mensal" numeric(10, 2) NOT NULL,
	"servicos_inclusos" jsonb,
	"limite_uso" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametros_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"chave" varchar(100) NOT NULL,
	"valor" text NOT NULL,
	"tipo" varchar(20) DEFAULT 'select' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitacoes_cadastro" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfis_acesso" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"descricao" text NOT NULL,
	"tipo" text DEFAULT 'web' NOT NULL,
	"permissoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profissionais_perfis" (
	"id" serial PRIMARY KEY NOT NULL,
	"profissional_id" integer NOT NULL,
	"perfil_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brevo_email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_index" integer NOT NULL,
	"dia" date NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer,
	"tipo" text NOT NULL,
	"assunto" text NOT NULL,
	"corpo" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profissional_servicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"profissional_id" integer NOT NULL,
	"servico_id" integer NOT NULL,
	"comissao_override" numeric(10, 2),
	"tempo_override" integer,
	"preco_override" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profissional_servico_unique" UNIQUE("profissional_id","servico_id")
);
--> statement-breakpoint
CREATE TABLE "caixa_diario" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"data_abertura" timestamp DEFAULT now() NOT NULL,
	"data_fechamento" timestamp,
	"valor_abertura" numeric(10, 2) DEFAULT '0' NOT NULL,
	"valor_fechamento" numeric(10, 2),
	"total_entradas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_saidas" numeric(10, 2) DEFAULT '0' NOT NULL,
	"saldo_final" numeric(10, 2),
	"status" text DEFAULT 'aberto' NOT NULL,
	"observacao" text,
	"aberto_por" text,
	"fechado_por" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentacoes_caixa" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"caixa_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"categoria" text,
	"descricao" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"forma_pagamento" text,
	"referencia" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias_servico" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"contato" text,
	"telefone" text,
	"email" text,
	"cnpj" text,
	"endereco" text,
	"observacao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"marca" text,
	"modelo" text,
	"numero_serie" text,
	"data_compra" text,
	"valor_compra" numeric(10, 2),
	"proxima_manutencao" text,
	"quantidade_maxima" integer DEFAULT 1 NOT NULL,
	"servicos_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'ativo' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anamnese_clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"formulario_id" integer NOT NULL,
	"respostas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preenchido_em" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anamnese_formularios" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"tipo_id" integer,
	"titulo" text NOT NULL,
	"campos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipo_anamnese" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bandeiras" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"taxa" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deducoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"profissional_id" integer,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"mes_ano" text NOT NULL,
	"data" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remuneracoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"profissional_id" integer,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"mes_ano" text NOT NULL,
	"data" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens_padrao" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pesquisa_satisfacao" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"perguntas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"envio_automatico" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "respostas_pesquisa" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"pesquisa_id" integer NOT NULL,
	"cliente_id" integer,
	"cliente_nome" text,
	"profissional_id" integer,
	"profissional_nome" text,
	"respostas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"nota" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rodizio" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"profissionais" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"regras" jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer,
	"titulo" text NOT NULL,
	"tipo" text NOT NULL,
	"url" text,
	"conteudo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restricoes_cliente" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clube_vantagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"tipo" text NOT NULL,
	"valor_desconto" numeric(10, 2),
	"percentual_desconto" numeric(5, 2),
	"pontos_necessarios" integer DEFAULT 0,
	"regras" jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comissoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"profissional_id" integer NOT NULL,
	"profissional_nome" text NOT NULL,
	"comanda_id" integer,
	"mes_ano" text NOT NULL,
	"valor_base" numeric(10, 2) NOT NULL,
	"percentual" numeric(5, 2) NOT NULL,
	"valor_comissao" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"data_pagamento" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas_profissional" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"profissional_id" integer NOT NULL,
	"profissional_nome" text NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"mes_ano" text NOT NULL,
	"data" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"barbearia_id" integer NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliente_push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_user_id" integer NOT NULL,
	"barbearia_id" integer,
	"token" text NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens_agendamento" (
	"id" serial PRIMARY KEY NOT NULL,
	"agendamento_id" integer NOT NULL,
	"cliente_user_id" integer NOT NULL,
	"barbearia_id" integer NOT NULL,
	"remetente" text NOT NULL,
	"mensagem" text NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"acao" text NOT NULL,
	"barbearia_id" integer,
	"detalhes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"usado" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "filiais" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"nome" text NOT NULL,
	"cep" text,
	"logradouro" text,
	"numero" text,
	"bairro" text,
	"cidade" text,
	"uf" text,
	"telefone" text,
	"horario_funcionamento" jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes_lidas" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificacao_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"lida_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbearia_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"corpo" text NOT NULL,
	"tipo" text DEFAULT 'geral' NOT NULL,
	"dados" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lgpd_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tipo" text DEFAULT 'full' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"accepted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "barbearias" ADD CONSTRAINT "barbearias_dono_id_users_id_fk" FOREIGN KEY ("dono_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_filial_id_filiais_id_fk" FOREIGN KEY ("filial_id") REFERENCES "public"."filiais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_filial_id_filiais_id_fk" FOREIGN KEY ("filial_id") REFERENCES "public"."filiais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_filial_id_filiais_id_fk" FOREIGN KEY ("filial_id") REFERENCES "public"."filiais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_financeiras" ADD CONSTRAINT "contas_financeiras_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacotes_cliente" ADD CONSTRAINT "pacotes_cliente_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacotes_cliente" ADD CONSTRAINT "pacotes_cliente_pacote_id_pacotes_id_fk" FOREIGN KEY ("pacote_id") REFERENCES "public"."pacotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacotes_cliente" ADD CONSTRAINT "pacotes_cliente_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacotes" ADD CONSTRAINT "pacotes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recompensas" ADD CONSTRAINT "recompensas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resgates" ADD CONSTRAINT "resgates_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resgates" ADD CONSTRAINT "resgates_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resgates" ADD CONSTRAINT "resgates_recompensa_id_recompensas_id_fk" FOREIGN KEY ("recompensa_id") REFERENCES "public"."recompensas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convites_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convites_perfil_acesso_id_perfis_acesso_id_fk" FOREIGN KEY ("perfil_acesso_id") REFERENCES "public"."perfis_acesso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueios_horario" ADD CONSTRAINT "bloqueios_horario_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueios_horario" ADD CONSTRAINT "bloqueios_horario_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos" ADD CONSTRAINT "tipos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos_clientes" ADD CONSTRAINT "grupos_clientes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noticias" ADD CONSTRAINT "noticias_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembretes_config" ADD CONSTRAINT "lembretes_config_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinantes" ADD CONSTRAINT "assinantes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinantes" ADD CONSTRAINT "assinantes_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinantes" ADD CONSTRAINT "assinantes_plano_id_planos_assinatura_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."planos_assinatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planos_assinatura" ADD CONSTRAINT "planos_assinatura_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametros_config" ADD CONSTRAINT "parametros_config_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes_cadastro" ADD CONSTRAINT "solicitacoes_cadastro_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_acesso" ADD CONSTRAINT "perfis_acesso_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais_perfis" ADD CONSTRAINT "profissionais_perfis_perfil_id_perfis_acesso_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfis_acesso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissional_servicos" ADD CONSTRAINT "profissional_servicos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissional_servicos" ADD CONSTRAINT "profissional_servicos_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissional_servicos" ADD CONSTRAINT "profissional_servicos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixa_diario" ADD CONSTRAINT "caixa_diario_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_caixa_id_caixa_diario_id_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixa_diario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias_servico" ADD CONSTRAINT "categorias_servico_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_clientes" ADD CONSTRAINT "anamnese_clientes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_clientes" ADD CONSTRAINT "anamnese_clientes_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_clientes" ADD CONSTRAINT "anamnese_clientes_formulario_id_anamnese_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."anamnese_formularios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_formularios" ADD CONSTRAINT "anamnese_formularios_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anamnese_formularios" ADD CONSTRAINT "anamnese_formularios_tipo_id_tipo_anamnese_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipo_anamnese"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipo_anamnese" ADD CONSTRAINT "tipo_anamnese_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bandeiras" ADD CONSTRAINT "bandeiras_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deducoes" ADD CONSTRAINT "deducoes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remuneracoes" ADD CONSTRAINT "remuneracoes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_padrao" ADD CONSTRAINT "mensagens_padrao_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pesquisa_satisfacao" ADD CONSTRAINT "pesquisa_satisfacao_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_pesquisa" ADD CONSTRAINT "respostas_pesquisa_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_pesquisa" ADD CONSTRAINT "respostas_pesquisa_pesquisa_id_pesquisa_satisfacao_id_fk" FOREIGN KEY ("pesquisa_id") REFERENCES "public"."pesquisa_satisfacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_pesquisa" ADD CONSTRAINT "respostas_pesquisa_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rodizio" ADD CONSTRAINT "rodizio_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricoes_cliente" ADD CONSTRAINT "restricoes_cliente_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restricoes_cliente" ADD CONSTRAINT "restricoes_cliente_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clube_vantagens" ADD CONSTRAINT "clube_vantagens_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_profissional" ADD CONSTRAINT "contas_profissional_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_push_tokens" ADD CONSTRAINT "cliente_push_tokens_cliente_user_id_cliente_users_id_fk" FOREIGN KEY ("cliente_user_id") REFERENCES "public"."cliente_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente_push_tokens" ADD CONSTRAINT "cliente_push_tokens_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_agendamento" ADD CONSTRAINT "mensagens_agendamento_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_agendamento" ADD CONSTRAINT "mensagens_agendamento_cliente_user_id_cliente_users_id_fk" FOREIGN KEY ("cliente_user_id") REFERENCES "public"."cliente_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens_agendamento" ADD CONSTRAINT "mensagens_agendamento_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filiais" ADD CONSTRAINT "filiais_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes_lidas" ADD CONSTRAINT "notificacoes_lidas_notificacao_id_notificacoes_id_fk" FOREIGN KEY ("notificacao_id") REFERENCES "public"."notificacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes_lidas" ADD CONSTRAINT "notificacoes_lidas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgpd_consents" ADD CONSTRAINT "lgpd_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;