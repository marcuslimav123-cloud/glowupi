import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const clientesTable = pgTable("clientes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  aniversario: text("aniversario"),
  observacoes: text("observacoes"),
  vip: boolean("vip").notNull().default(false),
  pontosFidelidade: integer("pontos_fidelidade").notNull().default(0),
  totalGasto: numeric("total_gasto", { precision: 12, scale: 2 }).notNull().default("0"),
  ultimaVisita: text("ultima_visita"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClienteSchema = createInsertSchema(clientesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientesTable.$inferSelect;
