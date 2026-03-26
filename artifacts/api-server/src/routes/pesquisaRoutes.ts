import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pesquisaSatisfacaoTable, respostasPesquisaTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(pesquisaSatisfacaoTable).where(eq(pesquisaSatisfacaoTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { titulo, perguntas, ativo } = req.body;
  const [row] = await db.insert(pesquisaSatisfacaoTable).values({ barbeariaId, titulo, perguntas: perguntas || [], ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  const { titulo, perguntas, ativo } = req.body;
  if (titulo !== undefined) updates.titulo = titulo;
  if (perguntas !== undefined) updates.perguntas = perguntas;
  if (ativo !== undefined) updates.ativo = ativo;
  const [row] = await db.update(pesquisaSatisfacaoTable).set(updates).where(and(eq(pesquisaSatisfacaoTable.id, id), eq(pesquisaSatisfacaoTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Pesquisa não encontrada" });
  res.json(fmt(row));
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(pesquisaSatisfacaoTable).where(and(eq(pesquisaSatisfacaoTable.id, parseInt(req.params.id)), eq(pesquisaSatisfacaoTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/:id/respostas", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const pesquisaId = parseInt(req.params.id);
  const rows = await db.select().from(respostasPesquisaTable).where(and(eq(respostasPesquisaTable.pesquisaId, pesquisaId), eq(respostasPesquisaTable.barbeariaId, barbeariaId)));
  res.json(rows.map(fmt));
});

router.post("/:id/respostas", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const pesquisaId = parseInt(req.params.id);
  const { clienteId, clienteNome, respostas, nota } = req.body;
  const [row] = await db.insert(respostasPesquisaTable).values({ barbeariaId, pesquisaId, clienteId, clienteNome, respostas: respostas || {}, nota }).returning();
  res.status(201).json(fmt(row));
});

export default router;
