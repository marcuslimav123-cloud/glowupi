import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable("sessions", {
  token: varchar("token", { length: 128 }).primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("sessions_user_id_idx").on(t.userId),
  expiresIdx: index("sessions_expires_at_idx").on(t.expiresAt),
}));

export const clientSessionsTable = pgTable("client_sessions", {
  token: varchar("token", { length: 128 }).primaryKey(),
  clienteUserId: integer("cliente_user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("client_sessions_user_id_idx").on(t.clienteUserId),
  expiresIdx: index("client_sessions_expires_at_idx").on(t.expiresAt),
}));

export type Session = typeof sessionsTable.$inferSelect;
export type ClientSession = typeof clientSessionsTable.$inferSelect;
