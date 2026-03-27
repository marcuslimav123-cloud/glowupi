import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resgatesTable, clientesTable, barbeariasTable, comandasTable } from "@workspace/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function formatResgate(r: any) {
  return { ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

async function calcPontosValidos(barbeariaId: number, clienteId: number, diasExpiracao: number): Promise<number> {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasExpiracao);
  const comandasValidas = await db.select({
    pontosGanhos: comandasTable.pontosGanhos,
  }).from(comandasTable).where(
    and(
      eq(comandasTable.barbeariaId, barbeariaId),
      eq(comandasTable.clienteId, clienteId),
      gte(comandasTable.createdAt, dataLimite)
    )
  );
  const totalPontosGanhos = comandasValidas.reduce((sum, c) => sum + (c.pontosGanhos || 0), 0);

  const resgatesNoWindow = await db.select({
    pontosUsados: resgatesTable.pontosUsados,
  }).from(resgatesTable).where(
    and(
      eq(resgatesTable.barbeariaId, barbeariaId),
      eq(resgatesTable.clienteId, clienteId),
      gte(resgatesTable.createdAt, dataLimite),
    )
  );
  const totalResgatado = resgatesNoWindow.reduce((sum, r) => sum + r.pontosUsados, 0);

  return Math.max(0, totalPontosGanhos - totalResgatado);
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

  const params = await getParametros(barbeariaId);

  if (params["fidelidade_desativar"] === "Sim") {
    return res.status(400).json({ error: "Programa de fidelidade está desativado" });
  }

  const diasExpiracao = parseInt(params["fidelidade_expiracao_pontos"] || "365");
  let saldoEfetivo = cliente.pontosFidelidade;
  if (diasExpiracao > 0) {
    saldoEfetivo = await calcPontosValidos(barbeariaId, clienteId, diasExpiracao);
    if (saldoEfetivo !== cliente.pontosFidelidade) {
      await db.update(clientesTable).set({ pontosFidelidade: saldoEfetivo }).where(eq(clientesTable.id, clienteId));
    }
  }
  if (saldoEfetivo < pontosUsados) {
    return res.status(400).json({
      error: diasExpiracao > 0
        ? `Pontos válidos insuficientes. Você tem ${saldoEfetivo} ponto(s) não expirado(s) (pontos expiram após ${diasExpiracao} dias).`
        : "Pontos insuficientes",
      pontosValidos: saldoEfetivo,
    });
  }

  await db.update(clientesTable).set({ pontosFidelidade: saldoEfetivo - pontosUsados }).where(eq(clientesTable.id, clienteId));
  const [resgate] = await db.insert(resgatesTable).values({
    barbeariaId, clienteId, clienteNome, recompensaId, recompensaNome, pontosUsados
  }).returning();

  const zerarComissao = params["comissao_zerar_fidelidade"] === "Sim";

  res.status(201).json({ ...formatResgate(resgate), zerarComissao });
});

export default router;
