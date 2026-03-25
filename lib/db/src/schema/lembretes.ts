import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const lembretesConfigTable = pgTable("lembretes_config", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  tipo: text("tipo").notNull(),
  intervaloDias: integer("intervalo_dias").notNull(),
  mensagemTemplate: text("mensagem_template").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLembreteConfigSchema = createInsertSchema(lembretesConfigTable).omit({
  id: true,
  createdAt: true,
});

export type InsertLembreteConfig = z.infer<typeof insertLembreteConfigSchema>;
export type LembreteConfig = typeof lembretesConfigTable.$inferSelect;
