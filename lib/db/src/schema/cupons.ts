import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const cuponsTable = pgTable("cupons", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  codigo: text("codigo").notNull(),
  tipo: text("tipo").notNull().default("percentual"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  validadeInicio: timestamp("validade_inicio"),
  validadeFim: timestamp("validade_fim"),
  usoMaximo: integer("uso_maximo"),
  usoAtual: integer("uso_atual").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCupomSchema = createInsertSchema(cuponsTable).omit({
  id: true,
  createdAt: true,
  usoAtual: true,
});

export type InsertCupom = z.infer<typeof insertCupomSchema>;
export type Cupom = typeof cuponsTable.$inferSelect;
