import { pgTable, serial, integer, varchar, text } from "drizzle-orm/pg-core";
import { barbeariasTable } from "./barbearias";

export const parametrosConfigTable = pgTable("parametros_config", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  chave: varchar("chave", { length: 100 }).notNull(),
  valor: text("valor").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull().default("select"),
});
