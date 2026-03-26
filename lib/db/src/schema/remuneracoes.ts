import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const remuneracoesTable = pgTable("remuneracoes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  profissionalId: integer("profissional_id"),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  mesAno: text("mes_ano").notNull(),
  data: text("data"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deducoesTable = pgTable("deducoes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  profissionalId: integer("profissional_id"),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  mesAno: text("mes_ano").notNull(),
  data: text("data"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRemuneracaoSchema = createInsertSchema(remuneracoesTable).omit({ id: true, createdAt: true });
export const insertDeducaoSchema = createInsertSchema(deducoesTable).omit({ id: true, createdAt: true });

export type InsertRemuneracao = z.infer<typeof insertRemuneracaoSchema>;
export type Remuneracao = typeof remuneracoesTable.$inferSelect;
export type InsertDeducao = z.infer<typeof insertDeducaoSchema>;
export type Deducao = typeof deducoesTable.$inferSelect;
