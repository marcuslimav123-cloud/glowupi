import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { documentosTable, restricoesClienteTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(documentosTable).where(eq(documentosTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, titulo, tipo, url, conteudo } = req.body;
  const [row] = await db.insert(documentosTable).values({ barbeariaId, clienteId, titulo, tipo, url, conteudo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  if (req.body.titulo !== undefined) updates.titulo = req.body.titulo;
  if (req.body.tipo !== undefined) updates.tipo = req.body.tipo;
  if (req.body.url !== undefined) updates.url = req.body.url;
  if (req.body.conteudo !== undefined) updates.conteudo = req.body.conteudo;
  const [row] = await db.update(documentosTable).set(updates).where(and(eq(documentosTable.id, id), eq(documentosTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Documento não encontrado" });
  res.json(fmt(row));
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(documentosTable).where(and(eq(documentosTable.id, parseInt(req.params.id)), eq(documentosTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/restricoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId } = req.query;
  const conditions = [eq(restricoesClienteTable.barbeariaId, barbeariaId)];
  if (clienteId) conditions.push(eq(restricoesClienteTable.clienteId, parseInt(clienteId as string)));
  const rows = await db.select().from(restricoesClienteTable).where(and(...conditions));
  res.json(rows.map(fmt));
});

router.post("/restricoes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, tipo, descricao } = req.body;
  const [row] = await db.insert(restricoesClienteTable).values({ barbeariaId, clienteId, tipo, descricao }).returning();
  res.status(201).json(fmt(row));
});

router.delete("/restricoes/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(restricoesClienteTable).where(and(eq(restricoesClienteTable.id, parseInt(req.params.id)), eq(restricoesClienteTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
