import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const caixaDiarioTable = pgTable("caixa_diario", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  dataAbertura: timestamp("data_abertura").notNull().defaultNow(),
  dataFechamento: timestamp("data_fechamento"),
  valorAbertura: numeric("valor_abertura", { precision: 10, scale: 2 }).notNull().default("0"),
  valorFechamento: numeric("valor_fechamento", { precision: 10, scale: 2 }),
  totalEntradas: numeric("total_entradas", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSaidas: numeric("total_saidas", { precision: 10, scale: 2 }).notNull().default("0"),
  saldoFinal: numeric("saldo_final", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("aberto"),
  observacao: text("observacao"),
  abertoPor: text("aberto_por"),
  fechadoPor: text("fechado_por"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const movimentacoesCaixaTable = pgTable("movimentacoes_caixa", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  caixaId: integer("caixa_id").notNull().references(() => caixaDiarioTable.id),
  tipo: text("tipo").notNull(),
  categoria: text("categoria"),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  formaPagamento: text("forma_pagamento"),
  referencia: text("referencia"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCaixaDiarioSchema = createInsertSchema(caixaDiarioTable).omit({ id: true, createdAt: true });
export const insertMovimentacaoCaixaSchema = createInsertSchema(movimentacoesCaixaTable).omit({ id: true, createdAt: true });

export type InsertCaixaDiario = z.infer<typeof insertCaixaDiarioSchema>;
export type CaixaDiario = typeof caixaDiarioTable.$inferSelect;
export type InsertMovimentacaoCaixa = z.infer<typeof insertMovimentacaoCaixaSchema>;
export type MovimentacaoCaixa = typeof movimentacoesCaixaTable.$inferSelect;
