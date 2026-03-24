import { pgTable, serial, text, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { agendamentosTable } from "./agendamentos";

export const comandasTable = pgTable("comandas", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  agendamentoId: integer("agendamento_id").notNull().references(() => agendamentosTable.id),
  clienteNome: text("cliente_nome").notNull(),
  profissionalId: integer("profissional_id").notNull(),
  profissionalNome: text("profissional_nome").notNull(),
  dataFechamento: timestamp("data_fechamento").notNull().defaultNow(),
  mesAno: text("mes_ano").notNull(),
  servicos: jsonb("servicos").notNull().default([]),
  produtos: jsonb("produtos").notNull().default([]),
  pagamentos: jsonb("pagamentos").notNull().default([]),
  valorTotal: numeric("valor_total", { precision: 10, scale: 2 }).notNull(),
  comissaoTotal: numeric("comissao_total", { precision: 10, scale: 2 }).notNull(),
  desconto: numeric("desconto", { precision: 10, scale: 2 }).default("0"),
  descontoTipo: text("desconto_tipo").default("valor"),
  parcelas: integer("parcelas").default(1),
  status: text("status").notNull().default("paga"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertComandaSchema = createInsertSchema(comandasTable).omit({
  id: true,
  createdAt: true,
});

export type InsertComanda = z.infer<typeof insertComandaSchema>;
export type Comanda = typeof comandasTable.$inferSelect;
