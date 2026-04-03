import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const adminLogsTable = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  acao: text("acao").notNull(),
  barbeariaId: integer("barbearia_id"),
  detalhes: jsonb("detalhes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminLog = typeof adminLogsTable.$inferSelect;
