import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mensagensTable, barbeariasTable } from "@workspace/db/schema";
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

function formatMsg(m: any) {
  return { ...m, dataEnvio: m.dataEnvio?.toISOString?.() ?? m.dataEnvio, createdAt: m.createdAt?.toISOString?.() ?? m.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const msgs = await db.select().from(mensagensTable).where(eq(mensagensTable.barbeariaId, barbeariaId));
  res.json(msgs.map(formatMsg));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { tipo, titulo, conteudo, destinatarios, status } = req.body;
  const [msg] = await db.insert(mensagensTable).values({
    barbeariaId, tipo, titulo, conteudo, destinatarios: destinatarios || [], status: status || "rascunho",
    dataEnvio: status === "enviada" ? new Date() : null
  }).returning();
  res.status(201).json(formatMsg(msg));
});

router.delete("/:mensagemId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const msgId = parseInt(req.params.mensagemId);
  await db.delete(mensagensTable).where(and(eq(mensagensTable.id, msgId), eq(mensagensTable.barbeariaId, barbeariaId)));
  res.json({ ok: true });
});

export default router;
