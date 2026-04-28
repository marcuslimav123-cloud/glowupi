import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cuponsTable, comandasTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql, desc, isNotNull } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return {
    ...r,
    valor: parseFloat(r.valor),
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    validadeInicio: r.validadeInicio?.toISOString?.() ?? r.validadeInicio,
    validadeFim: r.validadeFim?.toISOString?.() ?? r.validadeFim,
  };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(cuponsTable).where(eq(cuponsTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.get("/relatorio", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { inicio, fim } = req.query;

  const conditions = [
    eq(comandasTable.barbeariaId, barbeariaId),
    isNotNull(comandasTable.cupomId),
  ];
  if (inicio) {
    const dStart = new Date(inicio as string);
    conditions.push(gte(comandasTable.dataFechamento, dStart));
  }
  if (fim) {
    const dEnd = new Date(fim as string);
    dEnd.setHours(23, 59, 59, 999);
    conditions.push(lte(comandasTable.dataFechamento, dEnd));
  }

  const agg = await db
    .select({
      cupomId: comandasTable.cupomId,
      usos: sql<number>`count(*)::int`,
      receitaBruta: sql<string>`coalesce(sum(${comandasTable.valorTotal} + coalesce(${comandasTable.cupomDesconto}, 0)), 0)`,
      receitaLiquida: sql<string>`coalesce(sum(${comandasTable.valorTotal}), 0)`,
      descontoTotal: sql<string>`coalesce(sum(coalesce(${comandasTable.cupomDesconto}, 0)), 0)`,
    })
    .from(comandasTable)
    .where(and(...conditions))
    .groupBy(comandasTable.cupomId);

  const cupons = await db.select().from(cuponsTable).where(eq(cuponsTable.barbeariaId, barbeariaId));
  const cupomMap = new Map(cupons.map(c => [c.id, c]));

  const result = agg
    .filter(a => a.cupomId != null && cupomMap.has(a.cupomId))
    .map(a => {
      const c = cupomMap.get(a.cupomId!)!;
      const usos = Number(a.usos) || 0;
      const receitaBruta = parseFloat(a.receitaBruta || "0");
      const receitaLiquida = parseFloat(a.receitaLiquida || "0");
      const descontoTotal = parseFloat(a.descontoTotal || "0");
      const ticketMedio = usos > 0 ? receitaLiquida / usos : 0;
      return {
        cupomId: c.id,
        codigo: c.codigo,
        tipo: c.tipo,
        valor: parseFloat(c.valor),
        ativo: c.ativo,
        usos,
        receitaBruta,
        receitaLiquida,
        descontoTotal,
        ticketMedio,
      };
    });

  result.sort((a, b) => b.receitaLiquida - a.receitaLiquida);

  res.json(result);
});

router.get("/:cupomId/comandas", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const cupomId = parseInt(req.params.cupomId);
  if (isNaN(cupomId)) return res.status(400).json({ error: "cupomId inválido" });
  const { inicio, fim } = req.query;

  const [cupom] = await db.select().from(cuponsTable)
    .where(and(eq(cuponsTable.id, cupomId), eq(cuponsTable.barbeariaId, barbeariaId)))
    .limit(1);
  if (!cupom) return res.status(404).json({ error: "Cupom não encontrado" });

  const conditions = [
    eq(comandasTable.barbeariaId, barbeariaId),
    eq(comandasTable.cupomId, cupomId),
  ];
  if (inicio) {
    const dStart = new Date(inicio as string);
    conditions.push(gte(comandasTable.dataFechamento, dStart));
  }
  if (fim) {
    const dEnd = new Date(fim as string);
    dEnd.setHours(23, 59, 59, 999);
    conditions.push(lte(comandasTable.dataFechamento, dEnd));
  }

  const rows = await db.select({
    id: comandasTable.id,
    clienteNome: comandasTable.clienteNome,
    profissionalNome: comandasTable.profissionalNome,
    dataFechamento: comandasTable.dataFechamento,
    valorTotal: comandasTable.valorTotal,
    cupomDesconto: comandasTable.cupomDesconto,
  })
    .from(comandasTable)
    .where(and(...conditions))
    .orderBy(desc(comandasTable.dataFechamento));

  res.json({
    cupom: fmt(cupom),
    comandas: rows.map(r => {
      const valorFinal = parseFloat(r.valorTotal as string) || 0;
      const desconto = r.cupomDesconto != null ? parseFloat(r.cupomDesconto as string) : 0;
      return {
        id: r.id,
        clienteNome: r.clienteNome,
        profissionalNome: r.profissionalNome,
        dataFechamento: r.dataFechamento?.toISOString?.() ?? r.dataFechamento,
        valorBruto: valorFinal + desconto,
        cupomDesconto: desconto,
        valorFinal,
      };
    }),
  });
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { codigo, tipo, valor, validadeInicio, validadeFim, usoMaximo, ativo } = req.body;
  const [row] = await db.insert(cuponsTable).values({
    barbeariaId, codigo, tipo, valor: String(valor),
    validadeInicio: validadeInicio ? new Date(validadeInicio) : null,
    validadeFim: validadeFim ? new Date(validadeFim) : null,
    usoMaximo, ativo,
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:cupomId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const cupomId = parseInt(req.params.cupomId);
  const { codigo, tipo, valor, validadeInicio, validadeFim, usoMaximo, ativo } = req.body;
  const updates: any = {};
  if (codigo !== undefined) updates.codigo = codigo;
  if (tipo !== undefined) updates.tipo = tipo;
  if (valor !== undefined) updates.valor = String(valor);
  if (validadeInicio !== undefined) updates.validadeInicio = validadeInicio ? new Date(validadeInicio) : null;
  if (validadeFim !== undefined) updates.validadeFim = validadeFim ? new Date(validadeFim) : null;
  if (usoMaximo !== undefined) updates.usoMaximo = usoMaximo;
  if (ativo !== undefined) updates.ativo = ativo;
  const [row] = await db.update(cuponsTable).set(updates).where(and(eq(cuponsTable.id, cupomId), eq(cuponsTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Cupom não encontrado" });
  res.json(fmt(row));
});

router.post("/validar", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ error: "Código do cupom é obrigatório" });
  const [cupom] = await db.select().from(cuponsTable).where(and(eq(cuponsTable.barbeariaId, barbeariaId), eq(cuponsTable.codigo, codigo.toUpperCase()))).limit(1);
  if (!cupom) return res.status(404).json({ error: "Cupom não encontrado" });
  if (!cupom.ativo) return res.status(400).json({ error: "Cupom inativo" });
  const now = new Date();
  if (cupom.validadeInicio && now < cupom.validadeInicio) return res.status(400).json({ error: "Cupom ainda não está válido" });
  if (cupom.validadeFim && now > cupom.validadeFim) return res.status(400).json({ error: "Cupom expirado" });
  if (cupom.usoMaximo && cupom.usoAtual >= cupom.usoMaximo) return res.status(400).json({ error: "Cupom atingiu o limite de uso" });
  res.json(fmt(cupom));
});

router.post("/:cupomId/usar", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const cupomId = parseInt(req.params.cupomId);
  const [cupom] = await db.select().from(cuponsTable).where(and(eq(cuponsTable.id, cupomId), eq(cuponsTable.barbeariaId, barbeariaId))).limit(1);
  if (!cupom) return res.status(404).json({ error: "Cupom não encontrado" });
  await db.update(cuponsTable)
    .set({ usoAtual: sql`${cuponsTable.usoAtual} + 1` })
    .where(eq(cuponsTable.id, cupomId));
  res.json({ success: true, deprecated: true });
});

router.delete("/:cupomId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const cupomId = parseInt(req.params.cupomId);
  await db.delete(cuponsTable).where(and(eq(cuponsTable.id, cupomId), eq(cuponsTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
