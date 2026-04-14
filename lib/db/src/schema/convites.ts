import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { perfisAcessoTable } from "./perfisAcesso";
import { profissionaisTable } from "./profissionais";

export const convitesTable = pgTable("convites", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("colaborador"),
  perfilAcessoId: integer("perfil_acesso_id").references(() => perfisAcessoTable.id),
  profissionalId: integer("profissional_id").references(() => profissionaisTable.id),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pendente"),
  nomeConvidado: text("nome_convidado"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertConviteSchema = createInsertSchema(convitesTable).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export type InsertConvite = z.infer<typeof insertConviteSchema>;
export type Convite = typeof convitesTable.$inferSelect;
