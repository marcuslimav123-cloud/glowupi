import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agendamentosTable } from "./agendamentos";
import { clienteUsersTable } from "./clienteUsers";
import { barbeariasTable } from "./barbearias";

export const mensagensAgendamentoTable = pgTable("mensagens_agendamento", {
  id: serial("id").primaryKey(),
  agendamentoId: integer("agendamento_id").notNull().references(() => agendamentosTable.id),
  clienteUserId: integer("cliente_user_id").notNull().references(() => clienteUsersTable.id),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  remetente: text("remetente").notNull(),
  mensagem: text("mensagem").notNull(),
  lida: boolean("lida").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMensagemAgendamentoSchema = createInsertSchema(mensagensAgendamentoTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMensagemAgendamento = z.infer<typeof insertMensagemAgendamentoSchema>;
export type MensagemAgendamento = typeof mensagensAgendamentoTable.$inferSelect;
