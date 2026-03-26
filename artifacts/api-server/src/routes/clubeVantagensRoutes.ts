import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clubeVantagensTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, valorDesconto: r.valorDesconto ? parseFloat(r.valorDesconto) : null, percentualDesconto: r.percentualDesconto ? parseFloat(r.percentualDesconto) : null, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(clubeVantagensTable).where(eq(clubeVantagensTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, tipo, valorDesconto, percentualDesconto, pontosNecessarios, regras, ativo } = req.body;
  const [row] = await db.insert(clubeVantagensTable).values({
    barbeariaId, nome, descricao, tipo, pontosNecessarios, regras, ativo,
    valorDesconto: valorDesconto ? String(valorDesconto) : null,
    percentualDesconto: percentualDesconto ? String(percentualDesconto) : null,
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  if (req.body.nome !== undefined) updates.nome = req.body.nome;
  if (req.body.descricao !== undefined) updates.descricao = req.body.descricao;
  if (req.body.tipo !== undefined) updates.tipo = req.body.tipo;
  if (req.body.valorDesconto !== undefined) updates.valorDesconto = req.body.valorDesconto ? String(req.body.valorDesconto) : null;
  if (req.body.percentualDesconto !== undefined) updates.percentualDesconto = req.body.percentualDesconto ? String(req.body.percentualDesconto) : null;
  if (req.body.pontosNecessarios !== undefined) updates.pontosNecessarios = req.body.pontosNecessarios;
  if (req.body.regras !== undefined) updates.regras = req.body.regras;
  if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;
  const [row] = await db.update(clubeVantagensTable).set(updates).where(and(eq(clubeVantagensTable.id, id), eq(clubeVantagensTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Vantagem não encontrada" });
  res.json(fmt(row));
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(clubeVantagensTable).where(and(eq(clubeVantagensTable.id, parseInt(req.params.id)), eq(clubeVantagensTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
