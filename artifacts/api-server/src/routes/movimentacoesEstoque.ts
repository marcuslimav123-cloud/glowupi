import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { movimentacoesEstoqueTable, produtosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

async function checkAccess(req: any, res: any): Promise<number | null> {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) { res.status(400).json({ error: "ID inválido" }); return null; }
  const [b] = await db.select().from(barbeariasTable).where(and(eq(barbeariasTable.id, barbeariaId), eq(barbeariasTable.donoId, req.user.id))).limit(1);
  if (!b) { res.status(403).json({ error: "Acesso negado" }); return null; }
  return barbeariaId;
}

function formatMov(m: any) {
  return { ...m, createdAt: m.createdAt?.toISOString?.() ?? m.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const produtoId = parseInt(req.params.produtoId);
  const movs = await db.select().from(movimentacoesEstoqueTable).where(and(eq(movimentacoesEstoqueTable.barbeariaId, barbeariaId), eq(movimentacoesEstoqueTable.produtoId, produtoId)));
  res.json(movs.map(formatMov));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const produtoId = parseInt(req.params.produtoId);
  const { tipo, quantidade, motivo, observacao } = req.body;
  const [produto] = await db.select().from(produtosTable).where(and(eq(produtosTable.id, produtoId), eq(produtosTable.barbeariaId, barbeariaId))).limit(1);
  if (!produto) { res.status(404).json({ error: "Produto não encontrado" }); return; }
  const novaQtd = tipo === "entrada" ? produto.quantidade + quantidade : produto.quantidade - quantidade;
  await db.update(produtosTable).set({ quantidade: novaQtd, updatedAt: new Date() }).where(eq(produtosTable.id, produtoId));
  const [mov] = await db.insert(movimentacoesEstoqueTable).values({
    barbeariaId, produtoId, tipo, quantidade, motivo, observacao
  }).returning();
  res.status(201).json(formatMov(mov));
});

export default router;
