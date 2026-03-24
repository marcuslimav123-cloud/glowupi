import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pacotesTable, pacotesClienteTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatPacote(p: any) {
  return { ...p, preco: parseFloat(p.preco), validadeDias: p.validade, createdAt: p.createdAt?.toISOString?.() ?? p.createdAt, updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const pacotes = await db.select().from(pacotesTable).where(eq(pacotesTable.barbeariaId, barbeariaId));
  res.json(pacotes.map(formatPacote));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, itens, preco, sessoesTotal, validadeDias, ativo } = req.body;
  const [pacote] = await db.insert(pacotesTable).values({
    barbeariaId, nome, descricao, itens: itens || [], preco: String(preco), sessoesTotal, validade: validadeDias, ativo
  }).returning();
  res.status(201).json(formatPacote(pacote));
});

router.put("/:pacoteId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const pacoteId = parseInt(req.params.pacoteId);
  const { nome, descricao, itens, preco, sessoesTotal, validadeDias, ativo } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (nome !== undefined) updates.nome = nome;
  if (descricao !== undefined) updates.descricao = descricao;
  if (itens !== undefined) updates.itens = itens;
  if (preco !== undefined) updates.preco = String(preco);
  if (sessoesTotal !== undefined) updates.sessoesTotal = sessoesTotal;
  if (validadeDias !== undefined) updates.validade = validadeDias;
  if (ativo !== undefined) updates.ativo = ativo;
  const [pacote] = await db.update(pacotesTable).set(updates).where(and(eq(pacotesTable.id, pacoteId), eq(pacotesTable.barbeariaId, barbeariaId))).returning();
  res.json(formatPacote(pacote));
});

export default router;
