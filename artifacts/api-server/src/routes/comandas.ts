import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { comandasTable, agendamentosTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function formatComanda(c: any) {
  return {
    ...c,
    valorTotal: parseFloat(c.valorTotal),
    comissaoTotal: parseFloat(c.comissaoTotal),
    desconto: c.desconto ? parseFloat(c.desconto) : 0,
    dataFechamento: c.dataFechamento?.toISOString?.() ?? c.dataFechamento,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
  };
}

router.get("/config", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  return res.json({
    comanda_obrigatoriedade_bandeira: params["comanda_obrigatoriedade_bandeira"] || "Não",
    comanda_edicao_comissoes: params["comanda_edicao_comissoes"] || "Liberar",
    comanda_fechamento_nao_gestor: params["comanda_fechamento_nao_gestor"] || "Não",
    comanda_inserir_profissionais_caixa: params["comanda_inserir_profissionais_caixa"] || "Sim",
    comanda_ver_dia_caixa: params["comanda_ver_dia_caixa"] || "Sim",
    comanda_abertura_nao_gestor: params["comanda_abertura_nao_gestor"] || "Não",
    comanda_reabertura_nao_gestor: params["comanda_reabertura_nao_gestor"] || "Não",
  });
});

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;

  if (user.role === "colaborador") {
    const params = await getParametros(barbeariaId);
    if (params["comanda_inserir_profissionais_caixa"] !== "Sim") {
      return res.status(403).json({ error: "Visualização de caixa não permitida para seu perfil" });
    }
  }

  const { mes, profissionalId, dataInicio, dataFim } = req.query;
  const conditions = [eq(comandasTable.barbeariaId, barbeariaId)];
  if (mes) conditions.push(eq(comandasTable.mesAno, mes as string));
  if (profissionalId) conditions.push(eq(comandasTable.profissionalId, parseInt(profissionalId as string)));
  if (dataInicio) conditions.push(gte(comandasTable.dataFechamento, new Date(dataInicio as string)));
  if (dataFim) {
    const end = new Date(dataFim as string);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(comandasTable.dataFechamento, end));
  }
  const comandas = await db.select().from(comandasTable).where(and(...conditions)).orderBy(comandasTable.dataFechamento);
  return res.json(comandas.map(formatComanda));
});

router.put("/:comandaId/reabrir", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role !== "dono" && user.role !== "gerente") {
    if (params["comanda_reabertura_nao_gestor"] !== "Sim") {
      return res.status(403).json({ error: "Reabertura de comanda não permitida para seu perfil" });
    }
  }

  const comandaId = parseInt(req.params.comandaId);
  const [comanda] = await db.select().from(comandasTable).where(
    and(eq(comandasTable.id, comandaId), eq(comandasTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!comanda) return res.status(404).json({ error: "Comanda não encontrada" });

  const [agend] = await db.update(agendamentosTable)
    .set({ status: "confirmado", pago: false, updatedAt: new Date() })
    .where(eq(agendamentosTable.id, comanda.agendamentoId))
    .returning();

  await db.delete(comandasTable).where(eq(comandasTable.id, comandaId));

  return res.json({ message: "Comanda reaberta com sucesso", agendamentoId: comanda.agendamentoId });
});

router.get("/:comandaId/dia", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role !== "dono" && user.role !== "gerente") {
    if (params["comanda_ver_dia_caixa"] !== "Sim") {
      return res.status(403).json({ error: "Visualização do dia no caixa não permitida para seu perfil" });
    }
  }

  const comandaId = parseInt(req.params.comandaId);
  const [comanda] = await db.select().from(comandasTable).where(
    and(eq(comandasTable.id, comandaId), eq(comandasTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!comanda) return res.status(404).json({ error: "Comanda não encontrada" });

  const dataRef = comanda.dataFechamento ? new Date(comanda.dataFechamento) : new Date();
  const startOfDay = new Date(dataRef);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dataRef);
  endOfDay.setHours(23, 59, 59, 999);

  const comandasDia = await db.select().from(comandasTable).where(
    and(
      eq(comandasTable.barbeariaId, barbeariaId),
      gte(comandasTable.dataFechamento, startOfDay),
      lte(comandasTable.dataFechamento, endOfDay)
    )
  ).orderBy(comandasTable.dataFechamento);

  return res.json(comandasDia.map(formatComanda));
});

export default router;
