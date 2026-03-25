import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const barbeariasTable = pgTable("barbearias", {
  id: serial("id").primaryKey(),
  donoId: integer("dono_id").notNull().references(() => usersTable.id),
  nome: text("nome").notNull(),
  slug: text("slug").notNull().unique(),
  cnpj: text("cnpj"),
  telefone: text("telefone"),
  email: text("email"),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  uf: text("uf"),
  corPrimaria: text("cor_primaria").notNull().default("#3b82f6"),
  logoUrl: text("logo_url"),
  horarioFuncionamento: jsonb("horario_funcionamento"),
  fotos: jsonb("fotos").default([]),
  formasPagamento: jsonb("formas_pagamento").default([]),
  redesSociais: jsonb("redes_sociais").default({}),
  descricaoPublica: text("descricao_publica"),
  planoNome: text("plano_nome").notNull().default("Trial"),
  planoStatus: text("plano_status").notNull().default("ativo"),
  planoVencimento: timestamp("plano_vencimento"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionPeriod: text("subscription_period"),
  segmentacao: jsonb("segmentacao").default({}),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBarbeariaSchema = createInsertSchema(barbeariasTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBarbearia = z.infer<typeof insertBarbeariaSchema>;
export type Barbearia = typeof barbeariasTable.$inferSelect;
