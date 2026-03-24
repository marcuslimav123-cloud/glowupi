import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pacotesClienteTable, pacotesTable, barbeariasTable } from "@workspace/db/schema";
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

function formatPC(pc: any, pacoteNome?: string) {
  return { ...pc, dataCompra: pc.dataCompra?.toISOString?.() ?? pc.dataCompra, dataValidade: pc.dataValidade?.toISOString?.() ?? pc.dataValidade, createdAt: pc.createdAt?.toISOString?.() ?? pc.createdAt, pacoteNome: pacoteNome || "" };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const items = await db.select().from(pacotesClienteTable).where(eq(pacotesClienteTable.barbeariaId, barbeariaId));
  const pacotes = await db.select().from(pacotesTable).where(eq(pacotesTable.barbeariaId, barbeariaId));
  const pacoteMap = Object.fromEntries(pacotes.map(p => [p.id, p.nome]));
  res.json(items.map(pc => formatPC(pc, pacoteMap[pc.pacoteId])));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { pacoteId, clienteId, clienteNome } = req.body;
  const [pacote] = await db.select().from(pacotesTable).where(and(eq(pacotesTable.id, pacoteId), eq(pacotesTable.barbeariaId, barbeariaId))).limit(1);
  if (!pacote) { res.status(404).json({ error: "Pacote não encontrado" }); return; }
  const dataValidade = pacote.validade ? new Date(Date.now() + pacote.validade * 86400000) : null;
  const [pc] = await db.insert(pacotesClienteTable).values({
    barbeariaId, pacoteId, clienteId, clienteNome, sessoesTotal: pacote.sessoesTotal, dataValidade
  }).returning();
  res.status(201).json(formatPC(pc, pacote.nome));
});

router.post("/:pacoteClienteId/usar", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const pcId = parseInt(req.params.pacoteClienteId);
  const [pc] = await db.select().from(pacotesClienteTable).where(and(eq(pacotesClienteTable.id, pcId), eq(pacotesClienteTable.barbeariaId, barbeariaId))).limit(1);
  if (!pc) { res.status(404).json({ error: "Não encontrado" }); return; }
  if (pc.sessoesUsadas >= pc.sessoesTotal) { res.status(400).json({ error: "Todas as sessões já foram usadas" }); return; }
  const newUsadas = pc.sessoesUsadas + 1;
  const newStatus = newUsadas >= pc.sessoesTotal ? "concluido" : "ativo";
  const [updated] = await db.update(pacotesClienteTable).set({ sessoesUsadas: newUsadas, status: newStatus }).where(eq(pacotesClienteTable.id, pcId)).returning();
  const [pacote] = await db.select().from(pacotesTable).where(eq(pacotesTable.id, updated.pacoteId)).limit(1);
  res.json(formatPC(updated, pacote?.nome));
});

export default router;
