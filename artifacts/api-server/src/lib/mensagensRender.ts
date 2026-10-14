import { db } from "@workspace/db";
import { agendamentosTable, clientesTable, barbeariasTable } from "@workspace/db/schema";
import { and, asc, eq, gte, inArray } from "drizzle-orm";

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
    // Sem agendamento informado: usa o próximo horário marcado do cliente,
    // para {data}, {hora}, {profissional} e {servico} não ficarem em branco.
    const hoje = new Date().toISOString().slice(0, 10);
    const [prox] = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbeariaId),
        eq(agendamentosTable.clienteId, opts.clienteId),
        inArray(agendamentosTable.status, ["confirmado", "pendente_aprovacao"]),
        gte(agendamentosTable.data, hoje),
      )
    ).orderBy(asc(agendamentosTable.data), asc(agendamentosTable.horaInicio)).limit(1);
    if (prox) {
      ctx.servico = prox.servicoNome || "";
      ctx.data = fmtData(prox.data);
      ctx.hora = prox.horaInicio || "";
      ctx.profissional = prox.profissionalNome || "";
      ctx.valor = fmtValor(prox.valor);
    }
  }

  if (opts.overrides) {
    for (const [k, v] of Object.entries(opts.overrides)) {
      if (v !== undefined && v !== null) (ctx as any)[k] = v;
    }
  }

  return ctx;
}

// Nomes alternativos aceitos nos modelos (ex.: {estabelecimento} = {salao}).
const ALIASES: Record<string, keyof RenderContexto> = {
  nome_cliente: "cliente", nome: "cliente",
  horario: "hora",
  salao: "salao", estabelecimento: "salao", nome_empresa: "salao", empresa: "salao", barbearia: "salao",
  preco: "valor",
};

export function renderConteudo(template: string, ctx: RenderContexto): string {
  const lookup = (key: string): string | undefined => {
    const k = (ALIASES[key] ?? key) as string;
    const v = (ctx as any)[k];
    return v !== undefined && v !== null && v !== "" ? String(v) : undefined;
  };
  // Aceita {variavel} e também {{variavel}} (formato dos modelos de WhatsApp das Configurações).
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => lookup(key) ?? m)
    .replace(/\{(\w+)\}/g, (m, key) => lookup(key) ?? m);
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
