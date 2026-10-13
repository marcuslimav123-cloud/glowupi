import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tiposTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(tiposTable).where(eq(tiposTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { categoria, nome, descricao, ativo, isCartao, multiplicadorPontos, taxaOperadora, tipoBandeira, diasRecebimento, diasUteis } = req.body;
  const [row] = await db.insert(tiposTable).values({
    barbeariaId,
    categoria,
    nome,
    descricao,
    ativo,
    isCartao: categoria === "forma_pagamento" ? (isCartao ?? false) : null,
    multiplicadorPontos: categoria === "forma_pagamento" && multiplicadorPontos != null ? String(multiplicadorPontos) : null,
    taxaOperadora: categoria === "bandeira" && taxaOperadora != null ? String(taxaOperadora) : null,
    tipoBandeira: categoria === "bandeira" ? (tipoBandeira ?? null) : null,
    diasRecebimento: categoria === "bandeira" && diasRecebimento != null ? diasRecebimento : null,
    diasUteis: categoria === "bandeira" ? (diasUteis ?? false) : null,
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:tipoId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const tipoId = parseInt(req.params.tipoId);
  const [existing] = await db.select().from(tiposTable).where(and(eq(tiposTable.id, tipoId), eq(tiposTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Tipo não encontrado" });
  const { nome, descricao, ativo, isCartao, multiplicadorPontos, taxaOperadora, tipoBandeira, diasRecebimento, diasUteis } = req.body;
  const updates: Record<string, any> = {};
  if (nome !== undefined) updates.nome = nome;
  if (descricao !== undefined) updates.descricao = descricao;
  if (ativo !== undefined) updates.ativo = ativo;
  if (existing.categoria === "forma_pagamento") {
    if (isCartao !== undefined) updates.isCartao = isCartao;
    if (multiplicadorPontos !== undefined) updates.multiplicadorPontos = multiplicadorPontos != null ? String(multiplicadorPontos) : null;
  }
  if (existing.categoria === "bandeira") {
    if (taxaOperadora !== undefined) updates.taxaOperadora = taxaOperadora != null ? String(taxaOperadora) : null;
    if (tipoBandeira !== undefined) updates.tipoBandeira = tipoBandeira;
    if (diasRecebimento !== undefined) updates.diasRecebimento = diasRecebimento;
    if (diasUteis !== undefined) updates.diasUteis = diasUteis;
  }
  const [row] = await db.update(tiposTable).set(updates).where(eq(tiposTable.id, tipoId)).returning();
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
