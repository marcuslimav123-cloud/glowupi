import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { produtosTable, barbeariasTable } from "@workspace/db/schema";
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

function formatProduto(p: any) {
  return { ...p, preco: parseFloat(p.preco), custo: p.custo ? parseFloat(p.custo) : null, createdAt: p.createdAt?.toISOString?.() ?? p.createdAt, updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt };
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const produtos = await db.select().from(produtosTable).where(eq(produtosTable.barbeariaId, barbeariaId));
  return res.json(produtos.map(formatProduto));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, preco, custo, quantidade, quantidadeMinima, codigoBarras, validade } = req.body;
  if (!nome || preco === undefined) return res.status(400).json({ error: "Dados inválidos" });
  const [produto] = await db.insert(produtosTable).values({
    barbeariaId,
    nome,
    preco: String(preco),
    custo: custo ? String(custo) : null,
    quantidade: quantidade ?? 0,
    quantidadeMinima: quantidadeMinima ?? 5,
    codigoBarras: codigoBarras || null,
    validade: validade || null,
  }).returning();
  return res.status(201).json(formatProduto(produto));
});

router.put("/:produtoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.produtoId);
  const { nome, preco, custo, quantidade, quantidadeMinima, ativo, codigoBarras, validade } = req.body;
  const [existing] = await db.select().from(produtosTable).where(and(eq(produtosTable.id, id), eq(produtosTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Produto não encontrado" });
  const [updated] = await db.update(produtosTable).set({
    nome: nome ?? existing.nome,
    preco: preco !== undefined ? String(preco) : existing.preco,
    custo: custo !== undefined ? String(custo) : existing.custo,
    quantidade: quantidade !== undefined ? quantidade : existing.quantidade,
    quantidadeMinima: quantidadeMinima !== undefined ? quantidadeMinima : existing.quantidadeMinima,
    ativo: ativo !== undefined ? ativo : existing.ativo,
    codigoBarras: codigoBarras !== undefined ? (codigoBarras || null) : existing.codigoBarras,
    validade: validade !== undefined ? (validade || null) : existing.validade,
    updatedAt: new Date(),
  }).where(eq(produtosTable.id, id)).returning();
  return res.json(formatProduto(updated));
});

router.delete("/:produtoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.produtoId);
  await db.delete(produtosTable).where(and(eq(produtosTable.id, id), eq(produtosTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Produto removido" });
});

export default router;
