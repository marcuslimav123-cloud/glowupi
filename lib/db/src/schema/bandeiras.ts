import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const bandeirasTable = pgTable("bandeiras", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  taxa: numeric("taxa", { precision: 5, scale: 2 }).notNull().default("0"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBandeiraSchema = createInsertSchema(bandeirasTable).omit({ id: true, createdAt: true });
export type InsertBandeira = z.infer<typeof insertBandeiraSchema>;
export type Bandeira = typeof bandeirasTable.$inferSelect;
