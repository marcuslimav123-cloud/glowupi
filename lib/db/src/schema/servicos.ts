import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const servicosTable = pgTable("servicos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull(),
  duracaoMinutos: integer("duracao_minutos").notNull().default(30),
  descricao: text("descricao"),
  diasRetorno: integer("dias_retorno"),
  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertServicoSchema = createInsertSchema(servicosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServico = z.infer<typeof insertServicoSchema>;
export type Servico = typeof servicosTable.$inferSelect;
