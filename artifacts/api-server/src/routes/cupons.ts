import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cuponsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
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
  await db.update(cuponsTable).set({ usoAtual: cupom.usoAtual + 1 }).where(eq(cuponsTable.id, cupomId));
  res.json({ success: true });
});

router.delete("/:cupomId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const cupomId = parseInt(req.params.cupomId);
  await db.delete(cuponsTable).where(and(eq(cuponsTable.id, cupomId), eq(cuponsTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
