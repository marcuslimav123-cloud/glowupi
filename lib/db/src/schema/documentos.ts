import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";

export const documentosTable = pgTable("documentos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").references(() => clientesTable.id),
  titulo: text("titulo").notNull(),
  tipo: text("tipo").notNull(),
  url: text("url"),
  conteudo: text("conteudo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const restricoesClienteTable = pgTable("restricoes_cliente", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentoSchema = createInsertSchema(documentosTable).omit({ id: true, createdAt: true });
export const insertRestricaoClienteSchema = createInsertSchema(restricoesClienteTable).omit({ id: true, createdAt: true });

export type InsertDocumento = z.infer<typeof insertDocumentoSchema>;
export type Documento = typeof documentosTable.$inferSelect;
export type InsertRestricaoCliente = z.infer<typeof insertRestricaoClienteSchema>;
export type RestricaoCliente = typeof restricoesClienteTable.$inferSelect;
