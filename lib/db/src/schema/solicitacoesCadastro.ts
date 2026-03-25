import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { barbeariasTable } from "./barbearias";

export const solicitacoesCadastroTable = pgTable("solicitacoes_cadastro", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
