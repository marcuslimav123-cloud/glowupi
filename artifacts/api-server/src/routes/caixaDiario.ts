import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { caixaDiarioTable, movimentacoesCaixaTable } from "@workspace/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return {
    ...r,
    valorAbertura: parseFloat(r.valorAbertura || "0"),
    valorFechamento: r.valorFechamento ? parseFloat(r.valorFechamento) : null,
    totalEntradas: parseFloat(r.totalEntradas || "0"),
    totalSaidas: parseFloat(r.totalSaidas || "0"),
    saldoFinal: r.saldoFinal ? parseFloat(r.saldoFinal) : null,
    dataAbertura: r.dataAbertura?.toISOString?.() ?? r.dataAbertura,
    dataFechamento: r.dataFechamento?.toISOString?.() ?? r.dataFechamento,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

function fmtMov(r: any) {
  return {
    ...r,
    valor: parseFloat(r.valor || "0"),
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

router.get("/atual", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const [caixa] = await db.select().from(caixaDiarioTable)
    .where(and(eq(caixaDiarioTable.barbeariaId, barbeariaId), eq(caixaDiarioTable.status, "aberto")))
    .orderBy(desc(caixaDiarioTable.dataAbertura)).limit(1);
  if (!caixa) return res.json(null);
  const movs = await db.select().from(movimentacoesCaixaTable)
    .where(eq(movimentacoesCaixaTable.caixaId, caixa.id))
    .orderBy(desc(movimentacoesCaixaTable.createdAt));
  res.json({ ...fmt(caixa), movimentacoes: movs.map(fmtMov) });
});

router.get("/historico", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;
  const conditions = [eq(caixaDiarioTable.barbeariaId, barbeariaId)];
  if (dataInicio) conditions.push(gte(caixaDiarioTable.dataAbertura, new Date(dataInicio as string)));
  if (dataFim) {
    const end = new Date(dataFim as string);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(caixaDiarioTable.dataAbertura, end));
  }
  const rows = await db.select().from(caixaDiarioTable)
    .where(and(...conditions)).orderBy(desc(caixaDiarioTable.dataAbertura));
  res.json(rows.map(fmt));
});

router.post("/abrir", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const existing = await db.select().from(caixaDiarioTable)
    .where(and(eq(caixaDiarioTable.barbeariaId, barbeariaId), eq(caixaDiarioTable.status, "aberto"))).limit(1);
  if (existing.length > 0) return res.status(400).json({ error: "Já existe um caixa aberto" });
  const { valorAbertura, observacao } = req.body;
  const user = req.user;
  const [caixa] = await db.insert(caixaDiarioTable).values({
    barbeariaId,
    valorAbertura: String(valorAbertura || 0),
    observacao,
    abertoPor: user?.name || user?.email || "Sistema",
    status: "aberto",
  }).returning();
  res.status(201).json(fmt(caixa));
});

router.put("/:caixaId/fechar", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const caixaId = parseInt(req.params.caixaId);
  const [caixa] = await db.select().from(caixaDiarioTable)
    .where(and(eq(caixaDiarioTable.id, caixaId), eq(caixaDiarioTable.barbeariaId, barbeariaId))).limit(1);
  if (!caixa) return res.status(404).json({ error: "Caixa não encontrado" });
  if (caixa.status === "fechado") return res.status(400).json({ error: "Caixa já está fechado" });
  const user = req.user;
  const abertura = parseFloat(caixa.valorAbertura || "0");
  const entradas = parseFloat(caixa.totalEntradas || "0");
  const saidas = parseFloat(caixa.totalSaidas || "0");
  const saldo = abertura + entradas - saidas;
  const [updated] = await db.update(caixaDiarioTable).set({
    status: "fechado",
    dataFechamento: new Date(),
    valorFechamento: String(req.body.valorFechamento ?? saldo),
    saldoFinal: String(saldo),
    fechadoPor: user?.name || user?.email || "Sistema",
    observacao: req.body.observacao || caixa.observacao,
  }).where(eq(caixaDiarioTable.id, caixaId)).returning();
  res.json(fmt(updated));
});

router.get("/:caixaId/movimentacoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const caixaId = parseInt(req.params.caixaId);
  const movs = await db.select().from(movimentacoesCaixaTable)
    .where(and(eq(movimentacoesCaixaTable.caixaId, caixaId), eq(movimentacoesCaixaTable.barbeariaId, barbeariaId)))
    .orderBy(desc(movimentacoesCaixaTable.createdAt));
  res.json(movs.map(fmtMov));
});

router.post("/:caixaId/movimentacoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const caixaId = parseInt(req.params.caixaId);
  const [caixa] = await db.select().from(caixaDiarioTable)
    .where(and(eq(caixaDiarioTable.id, caixaId), eq(caixaDiarioTable.barbeariaId, barbeariaId))).limit(1);
  if (!caixa || caixa.status !== "aberto") return res.status(400).json({ error: "Caixa não está aberto" });
  const { tipo, categoria, descricao, valor, formaPagamento, referencia } = req.body;
  const [mov] = await db.insert(movimentacoesCaixaTable).values({
    barbeariaId, caixaId, tipo, categoria, descricao, valor: String(valor), formaPagamento, referencia,
  }).returning();
  const valorNum = parseFloat(String(valor));
  if (tipo === "entrada") {
    await db.update(caixaDiarioTable).set({
      totalEntradas: String(parseFloat(caixa.totalEntradas || "0") + valorNum),
    }).where(eq(caixaDiarioTable.id, caixaId));
  } else {
    await db.update(caixaDiarioTable).set({
      totalSaidas: String(parseFloat(caixa.totalSaidas || "0") + valorNum),
    }).where(eq(caixaDiarioTable.id, caixaId));
  }
  res.status(201).json(fmtMov(mov));
});

export default router;
