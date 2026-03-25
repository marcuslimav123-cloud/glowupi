import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const noticiasTable = pgTable("noticias", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo").notNull(),
  imagemUrl: text("imagem_url"),
  publicadoEm: timestamp("publicado_em"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gruposClientesTable = pgTable("grupos_clientes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  filtroJson: text("filtro_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNoticiaSchema = createInsertSchema(noticiasTable).omit({
  id: true,
  createdAt: true,
});

export const insertGrupoClienteSchema = createInsertSchema(gruposClientesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertNoticia = z.infer<typeof insertNoticiaSchema>;
export type Noticia = typeof noticiasTable.$inferSelect;
export type GrupoCliente = typeof gruposClientesTable.$inferSelect;
