import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const listaEsperaTable = pgTable("lista_espera", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteNome: text("cliente_nome").notNull(),
  clienteTelefone: text("cliente_telefone").notNull(),
  data: text("data").notNull(),
  servicoId: integer("servico_id"),
  profissionalId: integer("profissional_id"),
  status: text("status").notNull().default("aguardando"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertListaEsperaSchema = createInsertSchema(listaEsperaTable).omit({
  id: true,
  createdAt: true,
});

export type InsertListaEspera = z.infer<typeof insertListaEsperaSchema>;
export type ListaEspera = typeof listaEsperaTable.$inferSelect;
