import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { barbeariasTable } from "./barbearias";

export const perfisAcessoTable = pgTable("perfis_acesso", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  descricao: text("descricao").notNull(),
  tipo: text("tipo").notNull().default("web"),
  permissoes: jsonb("permissoes").notNull().default([]),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profissionaisPerfisTable = pgTable("profissionais_perfis", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id").notNull(),
  perfilId: integer("perfil_id").notNull().references(() => perfisAcessoTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
