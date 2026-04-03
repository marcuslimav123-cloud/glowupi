import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const filiaisTable = pgTable("filiais", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  uf: text("uf"),
  telefone: text("telefone"),
  horarioFuncionamento: jsonb("horario_funcionamento"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFilialSchema = createInsertSchema(filiaisTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFilial = z.infer<typeof insertFilialSchema>;
export type Filial = typeof filiaisTable.$inferSelect;
