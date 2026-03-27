import { pgTable, serial, integer, timestamp, unique, numeric } from "drizzle-orm/pg-core";
import { barbeariasTable } from "./barbearias";
import { profissionaisTable } from "./profissionais";
import { servicosTable } from "./servicos";

export const profissionalServicosTable = pgTable("profissional_servicos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  profissionalId: integer("profissional_id").notNull().references(() => profissionaisTable.id, { onDelete: "cascade" }),
  servicoId: integer("servico_id").notNull().references(() => servicosTable.id, { onDelete: "cascade" }),
  comissaoOverride: numeric("comissao_override", { precision: 10, scale: 2 }),
  tempoOverride: integer("tempo_override"),
  precoOverride: numeric("preco_override", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("profissional_servico_unique").on(table.profissionalId, table.servicoId),
]);

export type ProfissionalServico = typeof profissionalServicosTable.$inferSelect;
