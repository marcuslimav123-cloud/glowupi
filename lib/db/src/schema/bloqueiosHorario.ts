import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbeariasTable } from "./barbearias";
import { profissionaisTable } from "./profissionais";

export const bloqueiosHorarioTable = pgTable("bloqueios_horario", {
  id: serial("id").primaryKey(),
  barbeariaId: integer("barbearia_id").notNull().references(() => barbeariasTable.id),
  profissionalId: integer("profissional_id").notNull().references(() => profissionaisTable.id),
  data: text("data").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  motivo: text("motivo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBloqueioHorarioSchema = createInsertSchema(bloqueiosHorarioTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBloqueioHorario = z.infer<typeof insertBloqueioHorarioSchema>;
export type BloqueioHorario = typeof bloqueiosHorarioTable.$inferSelect;
