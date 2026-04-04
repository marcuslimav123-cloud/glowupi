import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbeariasTable } from "./barbearias";

export const notificacoesTable = pgTable("notificacoes", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  titulo: text("titulo").notNull(),
  corpo: text("corpo").notNull(),
  tipo: text("tipo").notNull().default("geral"),
  dados: jsonb("dados"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificacoesLidasTable = pgTable("notificacoes_lidas", {
  id: serial("id").primaryKey(),
  notificacaoId: integer("notificacao_id").notNull().references(() => notificacoesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  lidaAt: timestamp("lida_at").notNull().defaultNow(),
});

export type Notificacao = typeof notificacoesTable.$inferSelect;
