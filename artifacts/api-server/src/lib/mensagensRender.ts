import { db } from "@workspace/db";
import { agendamentosTable, clientesTable, barbeariasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const VARIAVEIS_DISPONIVEIS = [
  "cliente", "servico", "data", "hora", "profissional", "salao", "valor",
] as const;

export const CATEGORIAS_VALIDAS = [
  "aniversario", "pos_agendamento", "confirmacao", "lembrete",
  "retorno", "regulamento", "campanha", "outro",
] as const;

export type Categoria = typeof CATEGORIAS_VALIDAS[number];

export function isCategoriaValida(c: string | undefined | null): c is Categoria {
  return !!c && (CATEGORIAS_VALIDAS as readonly string[]).includes(c);
}

function fmtData(data: string): string {
  if (!data) return "";
  const parts = data.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return data;
}

function fmtValor(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface RenderContexto {
  cliente?: string;
  servico?: string;
  data?: string;
  hora?: string;
  profissional?: string;
  salao?: string;
  valor?: string;
}

export async function buildContexto(
  barbeariaId: number,
  opts: { agendamentoId?: number | null; clienteId?: number | null; overrides?: Record<string, string> }
): Promise<RenderContexto> {
  const ctx: RenderContexto = {};

  const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  ctx.salao = barb?.nome || "";

  if (opts.agendamentoId) {
    const [agend] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, opts.agendamentoId)).limit(1);
    if (agend) {
      ctx.cliente = agend.clienteNome || "";
      ctx.servico = agend.servicoNome || "";
      ctx.data = fmtData(agend.data);
      ctx.hora = agend.horaInicio || "";
      ctx.profissional = agend.profissionalNome || "";
      ctx.valor = fmtValor(agend.valor);
    }
  } else if (opts.clienteId) {
    const [cli] = await db.select().from(clientesTable).where(eq(clientesTable.id, opts.clienteId)).limit(1);
    if (cli) ctx.cliente = cli.nome || "";
  }

  if (opts.overrides) {
    for (const [k, v] of Object.entries(opts.overrides)) {
      if (v !== undefined && v !== null) (ctx as any)[k] = v;
    }
  }

  return ctx;
}

export function renderConteudo(template: string, ctx: RenderContexto): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => {
    const v = (ctx as any)[key];
    return v !== undefined && v !== null && v !== "" ? String(v) : m;
  });
}

export function renderExemplo(template: string): string {
  return renderConteudo(template, {
    cliente: "Maria Silva",
    servico: "Corte Feminino",
    data: "30/04/2026",
    hora: "14:30",
    profissional: "Ana",
    salao: "Salão Exemplo",
    valor: "R$ 80,00",
  });
}
