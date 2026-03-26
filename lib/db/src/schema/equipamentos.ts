import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const equipamentosTable = pgTable("equipamentos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  marca: text("marca"),
  modelo: text("modelo"),
  numeroSerie: text("numero_serie"),
  dataCompra: text("data_compra"),
  valorCompra: numeric("valor_compra", { precision: 10, scale: 2 }),
  proximaManutencao: text("proxima_manutencao"),
  status: text("status").notNull().default("ativo"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEquipamentoSchema = createInsertSchema(equipamentosTable).omit({ id: true, createdAt: true });
export type InsertEquipamento = z.infer<typeof insertEquipamentoSchema>;
export type Equipamento = typeof equipamentosTable.$inferSelect;
