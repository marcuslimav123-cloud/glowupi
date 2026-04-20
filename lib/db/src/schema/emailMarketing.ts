import { pgTable, serial, text, timestamp, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";
import { usersTable } from "./users";

export const emailCampaignsTable = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  autorUserId: integer("autor_user_id").references(() => usersTable.id),
  assunto: text("assunto").notNull(),
  corpo: text("corpo").notNull(),
  status: text("status").notNull().default("rascunho"),
  totalDestinatarios: integer("total_destinatarios").notNull().default(0),
  totalEnviados: integer("total_enviados").notNull().default(0),
  totalEntregues: integer("total_entregues").notNull().default(0),
  totalAbertos: integer("total_abertos").notNull().default(0),
  totalFalhas: integer("total_falhas").notNull().default(0),
  filtros: jsonb("filtros"),
  criadaEm: timestamp("criada_em").notNull().defaultNow(),
  enviadaEm: timestamp("enviada_em"),
  finalizadaEm: timestamp("finalizada_em"),
});

export const emailCampaignRecipientsTable = pgTable("email_campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => emailCampaignsTable.id, { onDelete: "cascade" }),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").references(() => clientesTable.id),
  email: text("email").notNull(),
  nome: text("nome"),
  status: text("status").notNull().default("pendente"),
  brevoMessageId: text("brevo_message_id"),
  unsubscribeToken: text("unsubscribe_token"),
  enviadoEm: timestamp("enviado_em"),
  entregueEm: timestamp("entregue_em"),
  abertoEm: timestamp("aberto_em"),
  erro: text("erro"),
});

export const emailDailyQuotaTable = pgTable("email_daily_quota", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  data: text("data").notNull(),
  modo: text("modo").notNull(),
  usado: integer("usado").notNull().default(0),
}, (t) => ({
  unq: uniqueIndex("email_daily_quota_unq").on(t.barbeariaId, t.data, t.modo),
}));

export type EmailCampaign = typeof emailCampaignsTable.$inferSelect;
export type EmailCampaignRecipient = typeof emailCampaignRecipientsTable.$inferSelect;
export type EmailDailyQuota = typeof emailDailyQuotaTable.$inferSelect;
