import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { planosAssinaturaTable, assinantesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmtPlano(r: any) {
  return { ...r, precoMensal: parseFloat(r.precoMensal), createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

function fmtAssinante(r: any) {
  return {
    ...r,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    dataInicio: r.dataInicio?.toISOString?.() ?? r.dataInicio,
    dataFim: r.dataFim?.toISOString?.() ?? r.dataFim,
  };
}

router.get("/planos", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(planosAssinaturaTable).where(eq(planosAssinaturaTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmtPlano));
});

router.post("/planos", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, precoMensal, servicosInclusos, limiteUso, ativo } = req.body;
  const [row] = await db.insert(planosAssinaturaTable).values({
    barbeariaId, nome, descricao, precoMensal: String(precoMensal), servicosInclusos, limiteUso, ativo,
  }).returning();
  res.status(201).json(fmtPlano(row));
});

router.put("/planos/:planoId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const planoId = parseInt(req.params.planoId);
  const { nome, descricao, precoMensal, servicosInclusos, limiteUso, ativo } = req.body;
  const updates: any = {};
  if (nome !== undefined) updates.nome = nome;
  if (descricao !== undefined) updates.descricao = descricao;
  if (precoMensal !== undefined) updates.precoMensal = String(precoMensal);
  if (servicosInclusos !== undefined) updates.servicosInclusos = servicosInclusos;
  if (limiteUso !== undefined) updates.limiteUso = limiteUso;
  if (ativo !== undefined) updates.ativo = ativo;
  const [row] = await db.update(planosAssinaturaTable).set(updates).where(and(eq(planosAssinaturaTable.id, planoId), eq(planosAssinaturaTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Plano não encontrado" });
  res.json(fmtPlano(row));
});

router.delete("/planos/:planoId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const planoId = parseInt(req.params.planoId);
  await db.delete(planosAssinaturaTable).where(and(eq(planosAssinaturaTable.id, planoId), eq(planosAssinaturaTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/assinantes", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(assinantesTable).where(eq(assinantesTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmtAssinante));
});

router.post("/assinantes", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, clienteNome, planoId, planoNome, status, dataInicio, dataFim } = req.body;
  const [row] = await db.insert(assinantesTable).values({
    barbeariaId, clienteId, clienteNome, planoId, planoNome, status,
    dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
    dataFim: dataFim ? new Date(dataFim) : null,
  }).returning();
  res.status(201).json(fmtAssinante(row));
});

router.put("/assinantes/:assinanteId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const assinanteId = parseInt(req.params.assinanteId);
  const { status, dataFim } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (dataFim !== undefined) updates.dataFim = dataFim ? new Date(dataFim) : null;
  const [row] = await db.update(assinantesTable).set(updates).where(and(eq(assinantesTable.id, assinanteId), eq(assinantesTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Assinante não encontrado" });
  res.json(fmtAssinante(row));
});

router.delete("/assinantes/:assinanteId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const assinanteId = parseInt(req.params.assinanteId);
  await db.delete(assinantesTable).where(and(eq(assinantesTable.id, assinanteId), eq(assinantesTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
