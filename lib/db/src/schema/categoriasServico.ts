import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const categoriasServicoTable = pgTable("categorias_servico", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ordem: integer("ordem").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCategoriaServicoSchema = createInsertSchema(categoriasServicoTable).omit({ id: true, createdAt: true });
export type InsertCategoriaServico = z.infer<typeof insertCategoriaServicoSchema>;
export type CategoriaServico = typeof categoriasServicoTable.$inferSelect;
