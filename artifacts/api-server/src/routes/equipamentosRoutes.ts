import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { equipamentosTable, servicosTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(equipamentosTable).where(eq(equipamentosTable.barbeariaId, barbeariaId));

  const servicosIds = rows.flatMap(r => (r.servicosIds as number[]) || []);
  let servicosMap: Record<number, string> = {};
  if (servicosIds.length > 0) {
    const unique = [...new Set(servicosIds)];
    const servicos = await db.select({ id: servicosTable.id, nome: servicosTable.nome }).from(servicosTable).where(and(inArray(servicosTable.id, unique), eq(servicosTable.barbeariaId, barbeariaId)));
    servicosMap = Object.fromEntries(servicos.map(s => [s.id, s.nome]));
  }

  const result = rows.map(r => ({
    ...fmt(r),
    servicosNomes: ((r.servicosIds as number[]) || []).map(id => servicosMap[id]).filter(Boolean),
  }));
  res.json(result);
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, quantidadeMaxima, servicosIds: rawIds } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });
  let validIds: number[] = [];
  if (Array.isArray(rawIds) && rawIds.length > 0) {
    const valid = await db.select({ id: servicosTable.id }).from(servicosTable).where(and(inArray(servicosTable.id, rawIds), eq(servicosTable.barbeariaId, barbeariaId)));
    validIds = valid.map(v => v.id);
  }
  const [row] = await db.insert(equipamentosTable).values({
    barbeariaId,
    nome: nome.trim(),
    descricao: descricao?.trim() || null,
    quantidadeMaxima: quantidadeMaxima || 1,
    servicosIds: validIds,
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:id", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  const { nome, descricao, quantidadeMaxima, servicosIds: rawIds, ativo } = req.body;
  if (nome !== undefined) updates.nome = nome.trim();
  if (descricao !== undefined) updates.descricao = descricao?.trim() || null;
  if (quantidadeMaxima !== undefined) updates.quantidadeMaxima = quantidadeMaxima;
  if (rawIds !== undefined) {
    if (Array.isArray(rawIds) && rawIds.length > 0) {
      const valid = await db.select({ id: servicosTable.id }).from(servicosTable).where(and(inArray(servicosTable.id, rawIds), eq(servicosTable.barbeariaId, barbeariaId)));
      updates.servicosIds = valid.map(v => v.id);
    } else {
      updates.servicosIds = [];
    }
  }
  if (ativo !== undefined) updates.ativo = ativo;
  const [row] = await db.update(equipamentosTable).set(updates)
    .where(and(eq(equipamentosTable.id, id), eq(equipamentosTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Equipamento não encontrado" });
  res.json(fmt(row));
});

router.delete("/:id", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  await db.delete(equipamentosTable).where(and(eq(equipamentosTable.id, id), eq(equipamentosTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
