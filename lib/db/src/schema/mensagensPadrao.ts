import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const mensagensPadraoTable = pgTable("mensagens_padrao", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo").notNull(),
  categoria: text("categoria").notNull().default("outro"),
  favorito: boolean("favorito").notNull().default(false),
  arquivado: boolean("arquivado").notNull().default(false),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMensagemPadraoSchema = createInsertSchema(mensagensPadraoTable).omit({ id: true, createdAt: true });
export type InsertMensagemPadrao = z.infer<typeof insertMensagemPadraoSchema>;
export type MensagemPadrao = typeof mensagensPadraoTable.$inferSelect;
