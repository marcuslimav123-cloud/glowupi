import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const mensagensTable = pgTable("mensagens", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo").notNull(),
  destinatarios: jsonb("destinatarios").notNull().default([]),
  dataEnvio: timestamp("data_envio"),
  status: text("status").notNull().default("rascunho"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMensagemSchema = createInsertSchema(mensagensTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMensagem = z.infer<typeof insertMensagemSchema>;
export type Mensagem = typeof mensagensTable.$inferSelect;
