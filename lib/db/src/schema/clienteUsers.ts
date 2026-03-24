import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clienteUsersTable = pgTable("cliente_users", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash"),
  googleId: text("google_id"),
  telefone: text("telefone"),
  fotoUrl: text("foto_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClienteUserSchema = createInsertSchema(clienteUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClienteUser = z.infer<typeof insertClienteUserSchema>;
export type ClienteUser = typeof clienteUsersTable.$inferSelect;
