import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";

export const atendimentosTable = pgTable("atendimentos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").references(() => clientesTable.id),
  clienteNome: text("cliente_nome").notNull(),
  clienteTelefone: text("cliente_telefone").notNull(),
  data: text("data").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  observacao: text("observacao"),
  pacoteClienteId: integer("pacote_cliente_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAtendimentoSchema = createInsertSchema(atendimentosTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAtendimento = z.infer<typeof insertAtendimentoSchema>;
export type Atendimento = typeof atendimentosTable.$inferSelect;
