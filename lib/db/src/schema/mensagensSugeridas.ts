import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { agendamentosTable } from "./agendamentos";
import { clientesTable } from "./clientes";
import { mensagensPadraoTable } from "./mensagensPadrao";

export const mensagensSugeridasTable = pgTable("mensagens_sugeridas", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  tipo: text("tipo").notNull(),
  agendamentoId: integer("agendamento_id").references(() => agendamentosTable.id),
  clienteId: integer("cliente_id").references(() => clientesTable.id),
  modeloPadraoId: integer("modelo_padrao_id").references(() => mensagensPadraoTable.id),
  contexto: jsonb("contexto").notNull().default({}),
  conteudoSugerido: text("conteudo_sugerido").notNull(),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  dedupeKey: text("dedupe_key").notNull().unique(),
});

export const insertMensagemSugeridaSchema = createInsertSchema(mensagensSugeridasTable).omit({ id: true, createdAt: true });
export type InsertMensagemSugerida = z.infer<typeof insertMensagemSugeridaSchema>;
export type MensagemSugerida = typeof mensagensSugeridasTable.$inferSelect;
