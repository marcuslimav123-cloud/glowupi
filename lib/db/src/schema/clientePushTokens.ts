import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clienteUsersTable } from "./clienteUsers";
import { barbeariasTable } from "./barbearias";

export const clientePushTokensTable = pgTable("cliente_push_tokens", {
  id: serial("id").primaryKey(),
  clienteUserId: integer("cliente_user_id").notNull().references(() => clienteUsersTable.id),
  barbeariaId: integer("barbearia_id").references(() => barbeariasTable.id),
  token: text("token").notNull(),
  platform: text("platform").notNull().default("web"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClientePushTokenSchema = createInsertSchema(clientePushTokensTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientePushToken = z.infer<typeof insertClientePushTokenSchema>;
export type ClientePushToken = typeof clientePushTokensTable.$inferSelect;
