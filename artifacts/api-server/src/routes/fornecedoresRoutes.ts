import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { fornecedoresTable, equipamentosTable, bandeirasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, valorCompra: r.valorCompra ? parseFloat(r.valorCompra) : null, taxa: r.taxa ? parseFloat(r.taxa) : null, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(fornecedoresTable).where(eq(fornecedoresTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, contato, telefone, email, cnpj, endereco, observacao, ativo } = req.body;
  const [row] = await db.insert(fornecedoresTable).values({ barbeariaId, nome, contato, telefone, email, cnpj, endereco, observacao, ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  for (const k of ["nome", "contato", "telefone", "email", "cnpj", "endereco", "observacao", "ativo"]) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const [row] = await db.update(fornecedoresTable).set(updates).where(and(eq(fornecedoresTable.id, id), eq(fornecedoresTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Fornecedor não encontrado" });
  res.json(fmt(row));
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(fornecedoresTable).where(and(eq(fornecedoresTable.id, parseInt(req.params.id)), eq(fornecedoresTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/equipamentos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(equipamentosTable).where(eq(equipamentosTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/equipamentos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, marca, modelo, numeroSerie, dataCompra, valorCompra, proximaManutencao, status, ativo } = req.body;
  const [row] = await db.insert(equipamentosTable).values({
    barbeariaId, nome, descricao, marca, modelo, numeroSerie, dataCompra,
    valorCompra: valorCompra ? String(valorCompra) : null, proximaManutencao, status, ativo,
  }).returning();
  res.status(201).json(fmt(row));
});

router.put("/equipamentos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  for (const k of ["nome", "descricao", "marca", "modelo", "numeroSerie", "dataCompra", "proximaManutencao", "status", "ativo"]) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (req.body.valorCompra !== undefined) updates.valorCompra = req.body.valorCompra ? String(req.body.valorCompra) : null;
  const [row] = await db.update(equipamentosTable).set(updates).where(and(eq(equipamentosTable.id, id), eq(equipamentosTable.barbeariaId, barbeariaId))).returning();
  res.json(fmt(row));
});

router.delete("/equipamentos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(equipamentosTable).where(and(eq(equipamentosTable.id, parseInt(req.params.id)), eq(equipamentosTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/bandeiras", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(bandeirasTable).where(eq(bandeirasTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/bandeiras", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, taxa, ativo } = req.body;
  const [row] = await db.insert(bandeirasTable).values({ barbeariaId, nome, taxa: String(taxa || 0), ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/bandeiras/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  if (req.body.nome !== undefined) updates.nome = req.body.nome;
  if (req.body.taxa !== undefined) updates.taxa = String(req.body.taxa);
  if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;
  const [row] = await db.update(bandeirasTable).set(updates).where(and(eq(bandeirasTable.id, id), eq(bandeirasTable.barbeariaId, barbeariaId))).returning();
  res.json(fmt(row));
});

router.delete("/bandeiras/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(bandeirasTable).where(and(eq(bandeirasTable.id, parseInt(req.params.id)), eq(bandeirasTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
