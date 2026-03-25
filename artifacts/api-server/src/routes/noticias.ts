import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { noticiasTable, gruposClientesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return {
    ...r,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    publicadoEm: r.publicadoEm?.toISOString?.() ?? r.publicadoEm,
  };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(noticiasTable).where(eq(noticiasTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { titulo, conteudo, imagemUrl, publicadoEm, ativo, grupoId } = req.body;
  const [row] = await db.insert(noticiasTable).values({
    barbeariaId, titulo, conteudo, imagemUrl,
    grupoId: grupoId ? parseInt(grupoId) : null,
    publicadoEm: publicadoEm ? new Date(publicadoEm) : null,
    ativo,
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:noticiaId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const noticiaId = parseInt(req.params.noticiaId);
  const { titulo, conteudo, imagemUrl, publicadoEm, ativo, grupoId } = req.body;
  const updates: any = {};
  if (titulo !== undefined) updates.titulo = titulo;
  if (conteudo !== undefined) updates.conteudo = conteudo;
  if (imagemUrl !== undefined) updates.imagemUrl = imagemUrl;
  if (publicadoEm !== undefined) updates.publicadoEm = publicadoEm ? new Date(publicadoEm) : null;
  if (ativo !== undefined) updates.ativo = ativo;
  if (grupoId !== undefined) updates.grupoId = grupoId ? parseInt(grupoId) : null;
  const [row] = await db.update(noticiasTable).set(updates).where(and(eq(noticiasTable.id, noticiaId), eq(noticiasTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Notícia não encontrada" });
  res.json(fmt(row));
});

router.delete("/:noticiaId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const noticiaId = parseInt(req.params.noticiaId);
  await db.delete(noticiasTable).where(and(eq(noticiasTable.id, noticiaId), eq(noticiasTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/grupos", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(gruposClientesTable).where(eq(gruposClientesTable.barbeariaId, barbeariaId));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
});

router.post("/grupos", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, filtroJson } = req.body;
  const [row] = await db.insert(gruposClientesTable).values({ barbeariaId, nome, filtroJson }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt?.toISOString?.() ?? row.createdAt });
});

router.put("/grupos/:grupoId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const grupoId = parseInt(req.params.grupoId);
  const { nome, filtroJson } = req.body;
  const updates: any = {};
  if (nome !== undefined) updates.nome = nome;
  if (filtroJson !== undefined) updates.filtroJson = filtroJson;
  const [row] = await db.update(gruposClientesTable).set(updates).where(and(eq(gruposClientesTable.id, grupoId), eq(gruposClientesTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Grupo não encontrado" });
  res.json({ ...row, createdAt: row.createdAt?.toISOString?.() ?? row.createdAt });
});

router.delete("/grupos/:grupoId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const grupoId = parseInt(req.params.grupoId);
  await db.delete(gruposClientesTable).where(and(eq(gruposClientesTable.id, grupoId), eq(gruposClientesTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
