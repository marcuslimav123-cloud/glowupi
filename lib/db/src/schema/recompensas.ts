import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";

export const recompensasTable = pgTable("recompensas", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  pontosNecessarios: integer("pontos_necessarios").notNull(),
  tipo: text("tipo").notNull().default("servico"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resgatesTable = pgTable("resgates", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  clienteNome: text("cliente_nome").notNull(),
  recompensaId: integer("recompensa_id").notNull().references(() => recompensasTable.id),
  recompensaNome: text("recompensa_nome").notNull(),
  pontosUsados: integer("pontos_usados").notNull(),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRecompensaSchema = createInsertSchema(recompensasTable).omit({
  id: true,
  createdAt: true,
});

export const insertResgateSchema = createInsertSchema(resgatesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRecompensa = z.infer<typeof insertRecompensaSchema>;
export type Recompensa = typeof recompensasTable.$inferSelect;
export type Resgate = typeof resgatesTable.$inferSelect;
