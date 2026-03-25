import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { lembretesConfigTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(lembretesConfigTable).where(eq(lembretesConfigTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { tipo, intervaloDias, mensagemTemplate, ativo } = req.body;
  const [row] = await db.insert(lembretesConfigTable).values({ barbeariaId, tipo, intervaloDias, mensagemTemplate, ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:lembreteId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const lembreteId = parseInt(req.params.lembreteId);
  const { tipo, intervaloDias, mensagemTemplate, ativo } = req.body;
  const updates: any = {};
  if (tipo !== undefined) updates.tipo = tipo;
  if (intervaloDias !== undefined) updates.intervaloDias = intervaloDias;
  if (mensagemTemplate !== undefined) updates.mensagemTemplate = mensagemTemplate;
  if (ativo !== undefined) updates.ativo = ativo;
  const [row] = await db.update(lembretesConfigTable).set(updates).where(and(eq(lembretesConfigTable.id, lembreteId), eq(lembretesConfigTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Lembrete não encontrado" });
  res.json(fmt(row));
});

router.delete("/:lembreteId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const lembreteId = parseInt(req.params.lembreteId);
  await db.delete(lembretesConfigTable).where(and(eq(lembretesConfigTable.id, lembreteId), eq(lembretesConfigTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
