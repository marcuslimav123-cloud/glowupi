import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const platformConfigTable = pgTable("platform_config", {
  id: serial("id").primaryKey(),
  chave: text("chave").notNull().unique(),
  valor: text("valor").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PlatformConfig = typeof platformConfigTable.$inferSelect;
