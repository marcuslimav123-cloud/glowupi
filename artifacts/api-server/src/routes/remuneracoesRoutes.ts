import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { remuneracoesTable, deducoesTable, rodizioTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, valor: r.valor ? parseFloat(r.valor) : 0, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/remuneracoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { mesAno, profissionalId } = req.query;
  const conditions = [eq(remuneracoesTable.barbeariaId, barbeariaId)];
  if (mesAno) conditions.push(eq(remuneracoesTable.mesAno, mesAno as string));
  if (profissionalId) conditions.push(eq(remuneracoesTable.profissionalId, parseInt(profissionalId as string)));
  const rows = await db.select().from(remuneracoesTable).where(and(...conditions));
  res.json(rows.map(fmt));
});

router.post("/remuneracoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { profissionalId, tipo, descricao, valor, mesAno, data, status } = req.body;
  const [row] = await db.insert(remuneracoesTable).values({ barbeariaId, profissionalId, tipo, descricao, valor: String(valor), mesAno, data, status }).returning();
  res.status(201).json(fmt(row));
});

router.put("/remuneracoes/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  for (const k of ["tipo", "descricao", "mesAno", "data", "status"]) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (req.body.valor !== undefined) updates.valor = String(req.body.valor);
  const [row] = await db.update(remuneracoesTable).set(updates).where(and(eq(remuneracoesTable.id, id), eq(remuneracoesTable.barbeariaId, barbeariaId))).returning();
  res.json(fmt(row));
});

router.delete("/remuneracoes/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(remuneracoesTable).where(and(eq(remuneracoesTable.id, parseInt(req.params.id)), eq(remuneracoesTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/deducoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { mesAno, profissionalId } = req.query;
  const conditions = [eq(deducoesTable.barbeariaId, barbeariaId)];
  if (mesAno) conditions.push(eq(deducoesTable.mesAno, mesAno as string));
  if (profissionalId) conditions.push(eq(deducoesTable.profissionalId, parseInt(profissionalId as string)));
  const rows = await db.select().from(deducoesTable).where(and(...conditions));
  res.json(rows.map(fmt));
});

router.post("/deducoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { profissionalId, tipo, descricao, valor, mesAno, data, status } = req.body;
  const [row] = await db.insert(deducoesTable).values({ barbeariaId, profissionalId, tipo, descricao, valor: String(valor), mesAno, data, status }).returning();
  res.status(201).json(fmt(row));
});

router.delete("/deducoes/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(deducoesTable).where(and(eq(deducoesTable.id, parseInt(req.params.id)), eq(deducoesTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/rodizio", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(rodizioTable).where(eq(rodizioTable.barbeariaId, barbeariaId));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
});

router.post("/rodizio", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, profissionais, regras, ativo } = req.body;
  const [row] = await db.insert(rodizioTable).values({ barbeariaId, nome, profissionais: profissionais || [], regras, ativo }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt?.toISOString?.() ?? row.createdAt });
});

router.put("/rodizio/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  if (req.body.nome !== undefined) updates.nome = req.body.nome;
  if (req.body.profissionais !== undefined) updates.profissionais = req.body.profissionais;
  if (req.body.regras !== undefined) updates.regras = req.body.regras;
  if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;
  const [row] = await db.update(rodizioTable).set(updates).where(and(eq(rodizioTable.id, id), eq(rodizioTable.barbeariaId, barbeariaId))).returning();
  res.json({ ...row, createdAt: row.createdAt?.toISOString?.() ?? row.createdAt });
});

router.delete("/rodizio/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(rodizioTable).where(and(eq(rodizioTable.id, parseInt(req.params.id)), eq(rodizioTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
