import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { agendamentosTable } from "./agendamentos";

export const avaliacoesTable = pgTable("avaliacoes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  agendamentoId: integer("agendamento_id").notNull().references(() => agendamentosTable.id),
  clienteNome: text("cliente_nome").notNull(),
  profissionalId: integer("profissional_id").notNull(),
  profissionalNome: text("profissional_nome").notNull(),
  nota: integer("nota").notNull(),
  comentario: text("comentario"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAvaliacaoSchema = createInsertSchema(avaliacoesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAvaliacao = z.infer<typeof insertAvaliacaoSchema>;
export type Avaliacao = typeof avaliacoesTable.$inferSelect;
