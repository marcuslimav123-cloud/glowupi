import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { listaEsperaTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatItem(i: any) {
  return { ...i, createdAt: i.createdAt?.toISOString?.() ?? i.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const items = await db.select().from(listaEsperaTable).where(eq(listaEsperaTable.barbeariaId, barbeariaId));
  res.json(items.map(formatItem));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteNome, clienteTelefone, data, servicoId, profissionalId, observacao } = req.body;
  const [item] = await db.insert(listaEsperaTable).values({
    barbeariaId, clienteNome, clienteTelefone, data, servicoId, profissionalId, observacao
  }).returning();
  res.status(201).json(formatItem(item));
});

router.put("/:itemId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const itemId = parseInt(req.params.itemId);
  const { status } = req.body;
  const [item] = await db.update(listaEsperaTable).set({ status }).where(and(eq(listaEsperaTable.id, itemId), eq(listaEsperaTable.barbeariaId, barbeariaId))).returning();
  res.json(formatItem(item));
});

router.delete("/:itemId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const itemId = parseInt(req.params.itemId);
  await db.delete(listaEsperaTable).where(and(eq(listaEsperaTable.id, itemId), eq(listaEsperaTable.barbeariaId, barbeariaId)));
  res.json({ ok: true });
});

export default router;
