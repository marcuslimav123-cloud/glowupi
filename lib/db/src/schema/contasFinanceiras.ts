import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const contasFinanceirasTable = pgTable("contas_financeiras", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  tipo: text("tipo").notNull(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: text("data_vencimento").notNull(),
  dataPagamento: text("data_pagamento"),
  status: text("status").notNull().default("pendente"),
  recorrente: boolean("recorrente").notNull().default(false),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContaFinanceiraSchema = createInsertSchema(contasFinanceirasTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContaFinanceira = z.infer<typeof insertContaFinanceiraSchema>;
export type ContaFinanceira = typeof contasFinanceirasTable.$inferSelect;
