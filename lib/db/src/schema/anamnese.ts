import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";

export const tipoAnamneseTable = pgTable("tipo_anamnese", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const anamneseFormulariosTable = pgTable("anamnese_formularios", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  tipoId: integer("tipo_id").references(() => tipoAnamneseTable.id),
  titulo: text("titulo").notNull(),
  campos: jsonb("campos").notNull().default([]),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const anamneseClientesTable = pgTable("anamnese_clientes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  formularioId: integer("formulario_id").notNull().references(() => anamneseFormulariosTable.id),
  respostas: jsonb("respostas").notNull().default({}),
  preenchidoEm: timestamp("preenchido_em").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTipoAnamneseSchema = createInsertSchema(tipoAnamneseTable).omit({ id: true, createdAt: true });
export const insertAnamneseFormularioSchema = createInsertSchema(anamneseFormulariosTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAnamneseClienteSchema = createInsertSchema(anamneseClientesTable).omit({ id: true, createdAt: true });

export type InsertTipoAnamnese = z.infer<typeof insertTipoAnamneseSchema>;
export type TipoAnamnese = typeof tipoAnamneseTable.$inferSelect;
export type InsertAnamneseFormulario = z.infer<typeof insertAnamneseFormularioSchema>;
export type AnamneseFormulario = typeof anamneseFormulariosTable.$inferSelect;
export type InsertAnamneseCliente = z.infer<typeof insertAnamneseClienteSchema>;
export type AnamneseCliente = typeof anamneseClientesTable.$inferSelect;
