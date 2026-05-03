import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const asaasContasTable = pgTable("asaas_contas", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id).unique(),
  ambiente: text("ambiente").notNull().default("sandbox"),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  walletId: text("wallet_id"),
  accountName: text("account_name"),
  accountEmail: text("account_email"),
  accountCpfCnpj: text("account_cpf_cnpj"),
  webhookToken: text("webhook_token").notNull(),
  webhookConfigured: boolean("webhook_configured").notNull().default(false),
  status: text("status").notNull().default("ativo"),
  ultimaValidacao: timestamp("ultima_validacao"),
  ultimoErro: text("ultimo_erro"),
  splitOptIn: boolean("split_opt_in").notNull().default(false),
  splitPercentualPlataforma: numeric("split_percentual_plataforma", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pagamentosAsaasTable = pgTable("pagamentos_asaas", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").references(() => barbeariasTable.id),
  tipo: text("tipo").notNull(),
  refType: text("ref_type"),
  refId: integer("ref_id"),
  asaasPaymentId: text("asaas_payment_id").notNull(),
  asaasCustomerId: text("asaas_customer_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
  billingType: text("billing_type").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  valorLiquido: numeric("valor_liquido", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("PENDING"),
  description: text("description"),
  pixQrCodeBase64: text("pix_qr_code_base64"),
  pixCopyPaste: text("pix_copy_paste"),
  pixExpiraEm: timestamp("pix_expira_em"),
  bankSlipUrl: text("bank_slip_url"),
  invoiceUrl: text("invoice_url"),
  dueDate: text("due_date"),
  paidAt: timestamp("paid_at"),
  payerNome: text("payer_nome"),
  payerCpfCnpj: text("payer_cpf_cnpj"),
  payerEmail: text("payer_email"),
  payerTelefone: text("payer_telefone"),
  splitJson: jsonb("split_json"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  asaasPaymentIdIdx: uniqueIndex("pagamentos_asaas_payment_id_idx").on(t.asaasPaymentId),
  barbeariaTipoIdx: index("pagamentos_asaas_barb_tipo_idx").on(t.barbeariaId, t.tipo),
  refIdx: index("pagamentos_asaas_ref_idx").on(t.refType, t.refId),
}));

export const assinaturasAsaasTable = pgTable("assinaturas_asaas", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id).unique(),
  asaasCustomerId: text("asaas_customer_id").notNull(),
  asaasSubscriptionId: text("asaas_subscription_id").notNull(),
  plano: text("plano").notNull(),
  periodo: text("periodo").notNull().default("mensal"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  billingType: text("billing_type").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  proximoVencimento: text("proximo_vencimento"),
  cancelaEm: timestamp("cancela_em"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const asaasWebhookEventsTable = pgTable("asaas_webhook_events", {
  id: serial("id").primaryKey(),
  asaasContaId: integer("asaas_conta_id").references(() => asaasContasTable.id),
  evento: text("evento").notNull(),
  paymentId: text("payment_id"),
  subscriptionId: text("subscription_id"),
  payload: jsonb("payload").notNull(),
  processadoEm: timestamp("processado_em"),
  erro: text("erro"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniqueEvento: uniqueIndex("asaas_webhook_evento_unique_idx").on(t.evento, t.paymentId, t.subscriptionId),
}));

export const insertAsaasContaSchema = createInsertSchema(asaasContasTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPagamentoAsaasSchema = createInsertSchema(pagamentosAsaasTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssinaturaAsaasSchema = createInsertSchema(assinaturasAsaasTable).omit({ id: true, createdAt: true, updatedAt: true });

export type AsaasConta = typeof asaasContasTable.$inferSelect;
export type InsertAsaasConta = z.infer<typeof insertAsaasContaSchema>;
export type PagamentoAsaas = typeof pagamentosAsaasTable.$inferSelect;
export type InsertPagamentoAsaas = z.infer<typeof insertPagamentoAsaasSchema>;
export type AssinaturaAsaas = typeof assinaturasAsaasTable.$inferSelect;
export type InsertAssinaturaAsaas = z.infer<typeof insertAssinaturaAsaasSchema>;
export type AsaasWebhookEvent = typeof asaasWebhookEventsTable.$inferSelect;
