import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const rodizioTable = pgTable("rodizio", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  profissionais: jsonb("profissionais").notNull().default([]),
  regras: jsonb("regras"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRodizioSchema = createInsertSchema(rodizioTable).omit({ id: true, createdAt: true });
export type InsertRodizio = z.infer<typeof insertRodizioSchema>;
export type Rodizio = typeof rodizioTable.$inferSelect;
