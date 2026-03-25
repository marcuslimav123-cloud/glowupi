import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";

export const planosAssinaturaTable = pgTable("planos_assinatura", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  precoMensal: numeric("preco_mensal", { precision: 10, scale: 2 }).notNull(),
  servicosInclusos: jsonb("servicos_inclusos"),
  limiteUso: integer("limite_uso"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assinantesTable = pgTable("assinantes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").references(() => clientesTable.id),
  clienteNome: text("cliente_nome").notNull(),
  planoId: integer("plano_id").notNull().references(() => planosAssinaturaTable.id),
  planoNome: text("plano_nome").notNull(),
  status: text("status").notNull().default("ativo"),
  dataInicio: timestamp("data_inicio").notNull().defaultNow(),
  dataFim: timestamp("data_fim"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlanoAssinaturaSchema = createInsertSchema(planosAssinaturaTable).omit({
  id: true,
  createdAt: true,
});

export const insertAssinanteSchema = createInsertSchema(assinantesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPlanoAssinatura = z.infer<typeof insertPlanoAssinaturaSchema>;
export type PlanoAssinatura = typeof planosAssinaturaTable.$inferSelect;
export type InsertAssinante = z.infer<typeof insertAssinanteSchema>;
export type Assinante = typeof assinantesTable.$inferSelect;
