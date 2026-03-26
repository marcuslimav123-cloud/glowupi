import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const clubeVantagensTable = pgTable("clube_vantagens", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  tipo: text("tipo").notNull(),
  valorDesconto: numeric("valor_desconto", { precision: 10, scale: 2 }),
  percentualDesconto: numeric("percentual_desconto", { precision: 5, scale: 2 }),
  pontosNecessarios: integer("pontos_necessarios").default(0),
  regras: jsonb("regras"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClubeVantagemSchema = createInsertSchema(clubeVantagensTable).omit({ id: true, createdAt: true });
export type InsertClubeVantagem = z.infer<typeof insertClubeVantagemSchema>;
export type ClubeVantagem = typeof clubeVantagensTable.$inferSelect;
