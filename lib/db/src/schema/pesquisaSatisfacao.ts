import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";

export const pesquisaSatisfacaoTable = pgTable("pesquisa_satisfacao", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  titulo: text("titulo").notNull(),
  perguntas: jsonb("perguntas").notNull().default([]),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const respostasPesquisaTable = pgTable("respostas_pesquisa", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  pesquisaId: integer("pesquisa_id").notNull().references(() => pesquisaSatisfacaoTable.id),
  clienteId: integer("cliente_id").references(() => clientesTable.id),
  clienteNome: text("cliente_nome"),
  respostas: jsonb("respostas").notNull().default({}),
  nota: integer("nota"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPesquisaSatisfacaoSchema = createInsertSchema(pesquisaSatisfacaoTable).omit({ id: true, createdAt: true });
export const insertRespostaPesquisaSchema = createInsertSchema(respostasPesquisaTable).omit({ id: true, createdAt: true });

export type InsertPesquisaSatisfacao = z.infer<typeof insertPesquisaSatisfacaoSchema>;
export type PesquisaSatisfacao = typeof pesquisaSatisfacaoTable.$inferSelect;
export type InsertRespostaPesquisa = z.infer<typeof insertRespostaPesquisaSchema>;
export type RespostaPesquisa = typeof respostasPesquisaTable.$inferSelect;
