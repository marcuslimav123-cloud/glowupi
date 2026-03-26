import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const contasProfissionalTable = pgTable("contas_profissional", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  profissionalId: integer("profissional_id").notNull(),
  profissionalNome: text("profissional_nome").notNull(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  mesAno: text("mes_ano").notNull(),
  data: text("data"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContaProfissionalSchema = createInsertSchema(contasProfissionalTable).omit({ id: true, createdAt: true });
export type InsertContaProfissional = z.infer<typeof insertContaProfissionalSchema>;
export type ContaProfissional = typeof contasProfissionalTable.$inferSelect;
