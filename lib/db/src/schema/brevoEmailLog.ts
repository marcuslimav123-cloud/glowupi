import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";

export const brevoEmailLogTable = pgTable("brevo_email_log", {
  id: serial("id").primaryKey(),
  keyIndex: integer("key_index").notNull(),
  dia: date("dia").notNull(),
  contagem: integer("contagem").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
