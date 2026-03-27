import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const tiposTable = pgTable("tipos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  categoria: text("categoria").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(true),
  isCartao: boolean("is_cartao"),
  multiplicadorPontos: numeric("multiplicador_pontos", { precision: 5, scale: 2 }),
  taxaOperadora: numeric("taxa_operadora", { precision: 5, scale: 2 }),
  tipoBandeira: text("tipo_bandeira"),
  diasRecebimento: integer("dias_recebimento"),
  diasUteis: boolean("dias_uteis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTipoSchema = createInsertSchema(tiposTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTipo = z.infer<typeof insertTipoSchema>;
export type Tipo = typeof tiposTable.$inferSelect;
