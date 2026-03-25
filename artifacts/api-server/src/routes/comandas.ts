import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { comandasTable } from "@workspace/db/schema";
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

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
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

export default router;
