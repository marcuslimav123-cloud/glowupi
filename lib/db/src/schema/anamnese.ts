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
  observacoes: text("observacoes"),
  preenchidoPor: text("preenchido_por"),
  preenchidoEm: timestamp("preenchido_em").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const anamneseFotosTable = pgTable("anamnese_fotos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  tipo: text("tipo").notNull().default("antes"),
  fotoUrl: text("foto_url").notNull(),
  descricao: text("descricao"),
  procedimento: text("procedimento"),
  grupoId: text("grupo_id"),
  dataRegistro: timestamp("data_registro").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const anamneseConsentimentosTable = pgTable("anamnese_consentimentos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  titulo: text("titulo").notNull(),
  termoTexto: text("termo_texto").notNull(),
  assinaturaUrl: text("assinatura_url"),
  aceito: boolean("aceito").notNull().default(false),
  ipAddress: text("ip_address"),
  aceitoEm: timestamp("aceito_em"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTipoAnamneseSchema = createInsertSchema(tipoAnamneseTable).omit({ id: true, createdAt: true });
export const insertAnamneseFormularioSchema = createInsertSchema(anamneseFormulariosTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAnamneseClienteSchema = createInsertSchema(anamneseClientesTable).omit({ id: true, createdAt: true });
export const insertAnamneseFotoSchema = createInsertSchema(anamneseFotosTable).omit({ id: true, createdAt: true });
export const insertAnamneseConsentimentoSchema = createInsertSchema(anamneseConsentimentosTable).omit({ id: true, createdAt: true });

export type InsertTipoAnamnese = z.infer<typeof insertTipoAnamneseSchema>;
export type TipoAnamnese = typeof tipoAnamneseTable.$inferSelect;
export type InsertAnamneseFormulario = z.infer<typeof insertAnamneseFormularioSchema>;
export type AnamneseFormulario = typeof anamneseFormulariosTable.$inferSelect;
export type InsertAnamneseCliente = z.infer<typeof insertAnamneseClienteSchema>;
export type AnamneseCliente = typeof anamneseClientesTable.$inferSelect;
export type InsertAnamneseFoto = z.infer<typeof insertAnamneseFotoSchema>;
export type AnamneseFoto = typeof anamneseFotosTable.$inferSelect;
export type InsertAnamneseConsentimento = z.infer<typeof insertAnamneseConsentimentoSchema>;
export type AnamneseConsentimento = typeof anamneseConsentimentosTable.$inferSelect;
