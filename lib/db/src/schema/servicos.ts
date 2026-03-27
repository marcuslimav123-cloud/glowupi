import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";

export const servicosTable = pgTable("servicos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  nome: text("nome").notNull(),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull(),
  duracaoMinutos: integer("duracao_minutos").notNull().default(30),
  descricao: text("descricao"),
  diasRetorno: integer("dias_retorno"),
  mensagemRetorno: text("mensagem_retorno"),
  tipoPreco: text("tipo_preco").notNull().default("fixo"),
  imagemUrl: text("imagem_url"),
  disponivelOnline: boolean("disponivel_online").notNull().default(true),
  fidelidadeAtiva: boolean("fidelidade_ativa").notNull().default(false),
  pontosAcumular: integer("pontos_acumular").default(1),
  pontosResgate: integer("pontos_resgate").default(10),
  comissaoPorcentagem: numeric("comissao_porcentagem", { precision: 5, scale: 2 }),
  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertServicoSchema = createInsertSchema(servicosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServico = z.infer<typeof insertServicoSchema>;
export type Servico = typeof servicosTable.$inferSelect;
