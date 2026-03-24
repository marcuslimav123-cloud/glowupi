import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { avaliacoesTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatAvaliacao(a: any) {
  return { ...a, createdAt: a.createdAt?.toISOString?.() ?? a.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const avaliacoes = await db.select().from(avaliacoesTable).where(eq(avaliacoesTable.barbeariaId, barbeariaId));
  res.json(avaliacoes.map(formatAvaliacao));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { agendamentoId, clienteNome, profissionalId, profissionalNome, nota, comentario } = req.body;
  if (nota < 1 || nota > 5) { res.status(400).json({ error: "Nota deve ser entre 1 e 5" }); return; }
  const [avaliacao] = await db.insert(avaliacoesTable).values({
    barbeariaId, agendamentoId, clienteNome, profissionalId, profissionalNome, nota, comentario
  }).returning();
  res.status(201).json(formatAvaliacao(avaliacao));
});

export default router;
