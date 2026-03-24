import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { produtosTable } from "./produtos";

export const movimentacoesEstoqueTable = pgTable("movimentacoes_estoque", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  produtoId: integer("produto_id").notNull().references(() => produtosTable.id),
  tipo: text("tipo").notNull(),
  quantidade: integer("quantidade").notNull(),
  motivo: text("motivo").notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMovimentacaoEstoqueSchema = createInsertSchema(movimentacoesEstoqueTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMovimentacaoEstoque = z.infer<typeof insertMovimentacaoEstoqueSchema>;
export type MovimentacaoEstoque = typeof movimentacoesEstoqueTable.$inferSelect;
