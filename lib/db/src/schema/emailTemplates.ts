import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { barbeariasTable } from "./barbearias";

export const emailTemplatesTable = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").references(() => barbeariasTable.id),
  tipo: text("tipo").notNull(),
  assunto: text("assunto").notNull(),
  corpo: text("corpo").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
