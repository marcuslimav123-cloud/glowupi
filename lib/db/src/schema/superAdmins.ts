import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const superAdminsTable = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SuperAdmin = typeof superAdminsTable.$inferSelect;
