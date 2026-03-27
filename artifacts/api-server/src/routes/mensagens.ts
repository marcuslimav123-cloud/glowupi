import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mensagensTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatMsg(m: any) {
  return { ...m, dataEnvio: m.dataEnvio?.toISOString?.() ?? m.dataEnvio, createdAt: m.createdAt?.toISOString?.() ?? m.createdAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const msgs = await db.select().from(mensagensTable).where(eq(mensagensTable.barbeariaId, barbeariaId));
  res.json(msgs.map(formatMsg));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const { tipo, titulo, conteudo, destinatarios, status } = req.body;
    if (!tipo || !titulo || !conteudo) {
      return res.status(400).json({ error: "Tipo, título e conteúdo são obrigatórios" });
    }
    const [msg] = await db.insert(mensagensTable).values({
      barbeariaId, tipo, titulo, conteudo, destinatarios: destinatarios || [], status: status || "rascunho",
      dataEnvio: status === "enviada" ? new Date() : null
    }).returning();
    res.status(201).json(formatMsg(msg));
  } catch (err: unknown) {
    console.error("Erro ao criar mensagem:", err);
    return res.status(500).json({ error: "Erro interno ao criar mensagem" });
  }
});

router.delete("/:mensagemId", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const msgId = parseInt(req.params.mensagemId);
  await db.delete(mensagensTable).where(and(eq(mensagensTable.id, msgId), eq(mensagensTable.barbeariaId, barbeariaId)));
  res.json({ ok: true });
});

export default router;
