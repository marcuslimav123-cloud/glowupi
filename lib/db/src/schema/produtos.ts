import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const produtosTable = pgTable("produtos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull(),
  custo: numeric("custo", { precision: 10, scale: 2 }),
  quantidade: integer("quantidade").notNull().default(0),
  quantidadeMinima: integer("quantidade_minima").notNull().default(5),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProdutoSchema = createInsertSchema(produtosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduto = z.infer<typeof insertProdutoSchema>;
export type Produto = typeof produtosTable.$inferSelect;
