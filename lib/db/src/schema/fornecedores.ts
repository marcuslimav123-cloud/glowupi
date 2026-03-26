import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const fornecedoresTable = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  contato: text("contato"),
  telefone: text("telefone"),
  email: text("email"),
  cnpj: text("cnpj"),
  endereco: text("endereco"),
  observacao: text("observacao"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFornecedorSchema = createInsertSchema(fornecedoresTable).omit({ id: true, createdAt: true });
export type InsertFornecedor = z.infer<typeof insertFornecedorSchema>;
export type Fornecedor = typeof fornecedoresTable.$inferSelect;
