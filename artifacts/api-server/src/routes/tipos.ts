import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tiposTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(tiposTable).where(eq(tiposTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { categoria, nome, descricao, ativo } = req.body;
  const [row] = await db.insert(tiposTable).values({ barbeariaId, categoria, nome, descricao, ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:tipoId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const tipoId = parseInt(req.params.tipoId);
  const { nome, descricao, ativo } = req.body;
  const updates: any = {};
  if (nome !== undefined) updates.nome = nome;
  if (descricao !== undefined) updates.descricao = descricao;
  if (ativo !== undefined) updates.ativo = ativo;
  const [row] = await db.update(tiposTable).set(updates).where(and(eq(tiposTable.id, tipoId), eq(tiposTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Tipo não encontrado" });
  res.json(fmt(row));
});

router.delete("/:tipoId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const tipoId = parseInt(req.params.tipoId);
  await db.delete(tiposTable).where(and(eq(tiposTable.id, tipoId), eq(tiposTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
