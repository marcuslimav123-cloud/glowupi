import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { clientesTable } from "./clientes";
import { profissionaisTable } from "./profissionais";
import { servicosTable } from "./servicos";
import { filiaisTable } from "./filiais";

export const agendamentosTable = pgTable("agendamentos", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  filialId: integer("filial_id").references(() => filiaisTable.id),
  clienteId: integer("cliente_id").references(() => clientesTable.id),
  clienteNome: text("cliente_nome").notNull(),
  clienteTelefone: text("cliente_telefone").notNull(),
  profissionalId: integer("profissional_id").notNull().references(() => profissionaisTable.id),
  profissionalNome: text("profissional_nome").notNull(),
  servicoId: integer("servico_id").notNull().references(() => servicosTable.id),
  servicoNome: text("servico_nome").notNull(),
  data: text("data").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  status: text("status").notNull().default("confirmado"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  pago: boolean("pago").notNull().default(false),
  semPreferencia: boolean("sem_preferencia").notNull().default(false),
  observacao: text("observacao"),
  aniversario: boolean("aniversario").notNull().default(false),
  vip: boolean("vip").notNull().default(false),
  encaixe: boolean("encaixe").notNull().default(false),
  pacoteClienteId: integer("pacote_cliente_id"),
  atendimentoId: integer("atendimento_id"),
  origem: text("origem").default("manual"),
  sinalStatus: text("sinal_status").notNull().default("nao_aplicavel"),
  sinalValorDevido: numeric("sinal_valor_devido", { precision: 10, scale: 2 }).notNull().default("0"),
  sinalValorPago: numeric("sinal_valor_pago", { precision: 10, scale: 2 }).notNull().default("0"),
  sinalInformadoEm: timestamp("sinal_informado_em"),
  sinalConfirmadoEm: timestamp("sinal_confirmado_em"),
  sinalExpiraEm: timestamp("sinal_expira_em"),
  sinalComprovanteUrl: text("sinal_comprovante_url"),
  sinalAsaasPaymentId: text("sinal_asaas_payment_id"),
  sinalConsultaToken: text("sinal_consulta_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgendamentoSchema = createInsertSchema(agendamentosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgendamento = z.infer<typeof insertAgendamentoSchema>;
export type Agendamento = typeof agendamentosTable.$inferSelect;
