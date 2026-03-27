import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resgatesTable, clientesTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function formatResgate(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const resgates = await db.select().from(resgatesTable).where(eq(resgatesTable.barbeariaId, barbeariaId));
  res.json(resgates.map(formatResgate));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, clienteNome, recompensaId, recompensaNome, pontosUsados, comandaId } = req.body;
  const [cliente] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!cliente) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
  if (cliente.pontosFidelidade < pontosUsados) { res.status(400).json({ error: "Pontos insuficientes" }); return; }

  const params = await getParametros(barbeariaId);

  if (params["fidelidade_desativar"] === "Sim") {
    return res.status(400).json({ error: "Programa de fidelidade está desativado" });
  }

  const diasExpiracao = parseInt(params["fidelidade_expiracao_pontos"] || "365");
  if (diasExpiracao > 0 && cliente.ultimaVisita) {
    const ultimaVisitaDate = new Date(cliente.ultimaVisita);
    const agora = new Date();
    const diffDias = Math.ceil((agora.getTime() - ultimaVisitaDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias > diasExpiracao) {
      await db.update(clientesTable).set({ pontosFidelidade: 0 }).where(eq(clientesTable.id, clienteId));
      return res.status(400).json({ error: `Pontos expirados. Os pontos vencem após ${diasExpiracao} dias sem visita.` });
    }
  }

  await db.update(clientesTable).set({ pontosFidelidade: cliente.pontosFidelidade - pontosUsados }).where(eq(clientesTable.id, clienteId));
  const [resgate] = await db.insert(resgatesTable).values({
    barbeariaId, clienteId, clienteNome, recompensaId, recompensaNome, pontosUsados
  }).returning();

  const zerarComissao = params["comissao_zerar_fidelidade"] === "Sim";

  res.status(201).json({ ...formatResgate(resgate), zerarComissao });
});

export default router;
