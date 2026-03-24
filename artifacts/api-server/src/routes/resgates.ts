import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resgatesTable, clientesTable, barbeariasTable } from "@workspace/db/schema";
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

function formatResgate(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const resgates = await db.select().from(resgatesTable).where(eq(resgatesTable.barbeariaId, barbeariaId));
  res.json(resgates.map(formatResgate));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, clienteNome, recompensaId, recompensaNome, pontosUsados } = req.body;
  const [cliente] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!cliente) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
  if (cliente.pontosFidelidade < pontosUsados) { res.status(400).json({ error: "Pontos insuficientes" }); return; }
  await db.update(clientesTable).set({ pontosFidelidade: cliente.pontosFidelidade - pontosUsados }).where(eq(clientesTable.id, clienteId));
  const [resgate] = await db.insert(resgatesTable).values({
    barbeariaId, clienteId, clienteNome, recompensaId, recompensaNome, pontosUsados
  }).returning();
  res.status(201).json(formatResgate(resgate));
});

export default router;
