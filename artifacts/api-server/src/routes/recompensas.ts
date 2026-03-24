import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { recompensasTable, resgatesTable, clientesTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatRecompensa(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const recompensas = await db.select().from(recompensasTable).where(eq(recompensasTable.barbeariaId, barbeariaId));
  res.json(recompensas.map(formatRecompensa));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, pontosNecessarios, tipo, ativo } = req.body;
  const [recompensa] = await db.insert(recompensasTable).values({
    barbeariaId, nome, descricao, pontosNecessarios, tipo, ativo
  }).returning();
  res.status(201).json(formatRecompensa(recompensa));
});

router.put("/:recompensaId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const recompensaId = parseInt(req.params.recompensaId);
  const updates: any = {};
  const { nome, descricao, pontosNecessarios, tipo, ativo } = req.body;
  if (nome !== undefined) updates.nome = nome;
  if (descricao !== undefined) updates.descricao = descricao;
  if (pontosNecessarios !== undefined) updates.pontosNecessarios = pontosNecessarios;
  if (tipo !== undefined) updates.tipo = tipo;
  if (ativo !== undefined) updates.ativo = ativo;
  const [recompensa] = await db.update(recompensasTable).set(updates).where(and(eq(recompensasTable.id, recompensaId), eq(recompensasTable.barbeariaId, barbeariaId))).returning();
  res.json(formatRecompensa(recompensa));
});

export default router;
