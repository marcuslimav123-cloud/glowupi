import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const comissoesTable = pgTable("comissoes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  profissionalId: integer("profissional_id").notNull(),
  profissionalNome: text("profissional_nome").notNull(),
  comandaId: integer("comanda_id"),
  mesAno: text("mes_ano").notNull(),
  valorBase: numeric("valor_base", { precision: 10, scale: 2 }).notNull(),
  percentual: numeric("percentual", { precision: 5, scale: 2 }).notNull(),
  valorComissao: numeric("valor_comissao", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pendente"),
  dataPagamento: text("data_pagamento"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertComissaoSchema = createInsertSchema(comissoesTable).omit({ id: true, createdAt: true });
export type InsertComissao = z.infer<typeof insertComissaoSchema>;
export type Comissao = typeof comissoesTable.$inferSelect;
