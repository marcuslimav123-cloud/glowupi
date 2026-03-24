import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";

export const pacotesTable = pgTable("pacotes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  itens: jsonb("itens").notNull().default([]),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull(),
  sessoesTotal: integer("sessoes_total").notNull().default(1),
  validade: integer("validade_dias"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pacotesClienteTable = pgTable("pacotes_cliente", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  pacoteId: integer("pacote_id").notNull().references(() => pacotesTable.id),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  clienteNome: text("cliente_nome").notNull(),
  sessoesUsadas: integer("sessoes_usadas").notNull().default(0),
  sessoesTotal: integer("sessoes_total").notNull(),
  status: text("status").notNull().default("ativo"),
  dataCompra: timestamp("data_compra").notNull().defaultNow(),
  dataValidade: timestamp("data_validade"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPacoteSchema = createInsertSchema(pacotesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPacoteClienteSchema = createInsertSchema(pacotesClienteTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPacote = z.infer<typeof insertPacoteSchema>;
export type Pacote = typeof pacotesTable.$inferSelect;
export type PacoteCliente = typeof pacotesClienteTable.$inferSelect;
