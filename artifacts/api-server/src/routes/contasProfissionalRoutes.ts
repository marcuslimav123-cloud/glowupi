import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contasProfissionalTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, valor: parseFloat(r.valor), createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { mesAno, profissionalId, status } = req.query;
  const conditions = [eq(contasProfissionalTable.barbeariaId, barbeariaId)];
  if (mesAno) conditions.push(eq(contasProfissionalTable.mesAno, mesAno as string));
  if (profissionalId) conditions.push(eq(contasProfissionalTable.profissionalId, parseInt(profissionalId as string)));
  if (status) conditions.push(eq(contasProfissionalTable.status, status as string));
  const rows = await db.select().from(contasProfissionalTable).where(and(...conditions));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { profissionalId, profissionalNome, tipo, descricao, valor, mesAno, data, status } = req.body;
  const [row] = await db.insert(contasProfissionalTable).values({
    barbeariaId, profissionalId, profissionalNome, tipo, descricao,
    valor: String(valor), mesAno, data, status: status || "pendente",
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  const { tipo, descricao, valor, status, data } = req.body;
  if (tipo !== undefined) updates.tipo = tipo;
  if (descricao !== undefined) updates.descricao = descricao;
  if (valor !== undefined) updates.valor = String(valor);
  if (status !== undefined) updates.status = status;
  if (data !== undefined) updates.data = data;
  const [row] = await db.update(contasProfissionalTable).set(updates).where(and(eq(contasProfissionalTable.id, id), eq(contasProfissionalTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Conta não encontrada" });
  res.json(fmt(row));
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(contasProfissionalTable).where(and(eq(contasProfissionalTable.id, parseInt(req.params.id)), eq(contasProfissionalTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
