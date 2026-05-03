import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const vslProgressEventsTable = pgTable("vsl_progress_events", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  percent: integer("percent").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  sessionIdx: index("vsl_progress_session_idx").on(t.sessionId),
  createdAtIdx: index("vsl_progress_created_at_idx").on(t.createdAt),
}));

export type VslProgressEvent = typeof vslProgressEventsTable.$inferSelect;
