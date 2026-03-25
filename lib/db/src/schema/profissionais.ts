import { pgTable, serial, text, timestamp, integer, jsonb, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { usersTable } from "./users";

export const profissionaisTable = pgTable("profissionais", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  usuarioId: integer("usuario_id").references(() => usersTable.id),
  nomeExibicao: text("nome_exibicao").notNull(),
  fotoUrl: text("foto_url"),
  comissaoTipo: text("comissao_tipo").notNull().default("percentual"),
  comissaoValor: numeric("comissao_valor", { precision: 10, scale: 2 }).notNull().default("40"),
  celular: text("celular"),
  especialidade: text("especialidade"),
  horarios: jsonb("horarios"),
  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProfissionalSchema = createInsertSchema(profissionaisTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProfissional = z.infer<typeof insertProfissionalSchema>;
export type Profissional = typeof profissionaisTable.$inferSelect;
