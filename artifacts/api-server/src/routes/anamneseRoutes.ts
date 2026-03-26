import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tipoAnamneseTable, anamneseFormulariosTable, anamneseClientesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt, updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt, preenchidoEm: r.preenchidoEm?.toISOString?.() ?? r.preenchidoEm };
}

router.get("/tipos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(tipoAnamneseTable).where(eq(tipoAnamneseTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/tipos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, ativo } = req.body;
  const [row] = await db.insert(tipoAnamneseTable).values({ barbeariaId, nome, descricao, ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/tipos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  if (req.body.nome !== undefined) updates.nome = req.body.nome;
  if (req.body.descricao !== undefined) updates.descricao = req.body.descricao;
  if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;
  const [row] = await db.update(tipoAnamneseTable).set(updates).where(and(eq(tipoAnamneseTable.id, id), eq(tipoAnamneseTable.barbeariaId, barbeariaId))).returning();
  res.json(fmt(row));
});

router.delete("/tipos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(tipoAnamneseTable).where(and(eq(tipoAnamneseTable.id, parseInt(req.params.id)), eq(tipoAnamneseTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/formularios", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(anamneseFormulariosTable).where(eq(anamneseFormulariosTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/formularios", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { tipoId, titulo, campos, ativo } = req.body;
  const [row] = await db.insert(anamneseFormulariosTable).values({ barbeariaId, tipoId, titulo, campos: campos || [], ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/formularios/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = { updatedAt: new Date() };
  if (req.body.titulo !== undefined) updates.titulo = req.body.titulo;
  if (req.body.campos !== undefined) updates.campos = req.body.campos;
  if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;
  if (req.body.tipoId !== undefined) updates.tipoId = req.body.tipoId;
  const [row] = await db.update(anamneseFormulariosTable).set(updates).where(and(eq(anamneseFormulariosTable.id, id), eq(anamneseFormulariosTable.barbeariaId, barbeariaId))).returning();
  res.json(fmt(row));
});

router.delete("/formularios/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(anamneseFormulariosTable).where(and(eq(anamneseFormulariosTable.id, parseInt(req.params.id)), eq(anamneseFormulariosTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/clientes/:clienteId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const rows = await db.select().from(anamneseClientesTable).where(and(eq(anamneseClientesTable.clienteId, clienteId), eq(anamneseClientesTable.barbeariaId, barbeariaId)));
  res.json(rows.map(fmt));
});

router.post("/clientes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, formularioId, respostas } = req.body;
  const [row] = await db.insert(anamneseClientesTable).values({ barbeariaId, clienteId, formularioId, respostas: respostas || {} }).returning();
  res.status(201).json(fmt(row));
});

export default router;
