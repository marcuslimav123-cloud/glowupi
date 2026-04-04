import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { produtosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatProduto(p: any) {
  return { ...p, preco: parseFloat(p.preco), custo: p.custo ? parseFloat(p.custo) : null, createdAt: p.createdAt?.toISOString?.() ?? p.createdAt, updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const produtos = await db.select().from(produtosTable).where(eq(produtosTable.barbeariaId, barbeariaId));
  return res.json(produtos.map(formatProduto));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, preco, custo, quantidade, quantidadeMinima, codigoBarras, validade, imagemUrl } = req.body;
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
    imagemUrl: imagemUrl || null,
  }).returning();
  return res.status(201).json(formatProduto(produto));
});

router.put("/:produtoId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.produtoId);
  const { nome, preco, custo, quantidade, quantidadeMinima, ativo, codigoBarras, validade, imagemUrl } = req.body;
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
    imagemUrl: imagemUrl !== undefined ? (imagemUrl || null) : existing.imagemUrl,
    updatedAt: new Date(),
  }).where(eq(produtosTable.id, id)).returning();
  return res.json(formatProduto(updated));
});

router.delete("/:produtoId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.produtoId);
  await db.delete(produtosTable).where(and(eq(produtosTable.id, id), eq(produtosTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Produto removido" });
});

export default router;
