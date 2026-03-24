import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  comandasTable, agendamentosTable, clientesTable,
  profissionaisTable, produtosTable, barbeariasTable
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function getDateRange(periodo: string, dataInicio?: string, dataFim?: string) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (periodo === "hoje") return { inicio: todayStr, fim: todayStr };
  if (periodo === "semana") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { inicio: d.toISOString().slice(0, 10), fim: todayStr };
  }
  if (periodo === "mes") {
    const d = new Date(today);
    d.setDate(1);
    return { inicio: d.toISOString().slice(0, 10), fim: todayStr };
  }
  if (periodo === "custom" && dataInicio && dataFim) return { inicio: dataInicio, fim: dataFim };
  const d = new Date(today);
  d.setDate(d.getDate() - 6);
  return { inicio: d.toISOString().slice(0, 10), fim: todayStr };
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;

  if (user.role === "colaborador") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const conditions: any[] = [
      eq(agendamentosTable.barbeariaId, barbeariaId),
      eq(agendamentosTable.data, todayStr),
    ];
    if (user.profissionalId) {
      conditions.push(eq(agendamentosTable.profissionalId, user.profissionalId));
    }
    const meusAgendamentos = await db.select().from(agendamentosTable).where(and(...conditions));
    return res.json({
      isColaboradorView: true,
      meusAgendamentosHoje: meusAgendamentos.map(a => ({
        ...a,
        valor: parseFloat(a.valor as string),
        createdAt: a.createdAt?.toISOString?.(),
        updatedAt: a.updatedAt?.toISOString?.(),
      })),
      totalAgendamentosHoje: meusAgendamentos.length,
      confirmados: meusAgendamentos.filter(a => a.status === "confirmado").length,
      pagos: meusAgendamentos.filter(a => a.pago).length,
    });
  }

  const { periodo = "semana", dataInicio, dataFim } = req.query;
  const { inicio, fim } = getDateRange(periodo as string, dataInicio as string, dataFim as string);

  const [comandas, agendamentos, clientes, profissionais, produtos] = await Promise.all([
    db.select().from(comandasTable).where(and(
      eq(comandasTable.barbeariaId, barbeariaId),
      sql`DATE(${comandasTable.dataFechamento}) >= ${inicio}`,
      sql`DATE(${comandasTable.dataFechamento}) <= ${fim}`
    )),
    db.select().from(agendamentosTable).where(and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      gte(agendamentosTable.data, inicio),
      lte(agendamentosTable.data, fim)
    )),
    db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId)),
    db.select().from(profissionaisTable).where(and(eq(profissionaisTable.barbeariaId, barbeariaId), eq(profissionaisTable.ativo, true))),
    db.select().from(produtosTable).where(eq(produtosTable.barbeariaId, barbeariaId)),
  ]);

  const faturamentoTotal = comandas.reduce((sum, c) => sum + parseFloat(c.valorTotal as string), 0);
  const totalAgendamentos = agendamentos.length;
  const agendamentosPagos = agendamentos.filter(a => a.pago).length;

  const inicioDate = new Date(inicio);
  const clientesNovos = clientes.filter(c => {
    const d = new Date(c.createdAt);
    return d >= inicioDate;
  }).length;

  const dias: Record<string, { valor: number; quantidade: number }> = {};
  comandas.forEach(c => {
    const d = c.dataFechamento?.toISOString().slice(0, 10) ?? "";
    if (!dias[d]) dias[d] = { valor: 0, quantidade: 0 };
    dias[d].valor += parseFloat(c.valorTotal as string);
    dias[d].quantidade += 1;
  });
  const faturamentoPorDia = Object.entries(dias).map(([data, v]) => ({ data, ...v })).sort((a, b) => a.data.localeCompare(b.data));

  const servicoMap: Record<number, { servicoId: number; nome: string; quantidade: number; valor: number }> = {};
  comandas.forEach(c => {
    const servs: any[] = (c.servicos as any) || [];
    servs.forEach(s => {
      if (!servicoMap[s.id]) servicoMap[s.id] = { servicoId: s.id, nome: s.nome, quantidade: 0, valor: 0 };
      servicoMap[s.id].quantidade += 1;
      servicoMap[s.id].valor += s.valor;
    });
  });
  const topServicos = Object.values(servicoMap).map(s => ({
    ...s,
    percentual: faturamentoTotal > 0 ? (s.valor / faturamentoTotal) * 100 : 0
  })).sort((a, b) => b.valor - a.valor).slice(0, 5);

  const profMap: Record<number, { profissionalId: number; nome: string; faturamento: number; comissao: number; atendimentos: number }> = {};
  profissionais.forEach(p => {
    profMap[p.id] = { profissionalId: p.id, nome: p.nomeExibicao, faturamento: 0, comissao: 0, atendimentos: 0 };
  });
  comandas.forEach(c => {
    if (profMap[c.profissionalId]) {
      profMap[c.profissionalId].faturamento += parseFloat(c.valorTotal as string);
      profMap[c.profissionalId].comissao += parseFloat(c.comissaoTotal as string);
      profMap[c.profissionalId].atendimentos += 1;
    }
  });
  const totalSlots = profissionais.length * 20;
  const rankingProfissionais = Object.values(profMap).map(p => ({
    ...p,
    ocupacao: totalSlots > 0 ? Math.min((p.atendimentos / 20) * 100, 100) : 0,
  })).sort((a, b) => b.faturamento - a.faturamento);

  const alertas: any[] = [];
  produtos.filter(p => p.ativo && p.quantidade <= p.quantidadeMinima).forEach(p => {
    alertas.push({ tipo: "estoque_baixo", mensagem: `Estoque baixo: ${p.nome} (${p.quantidade} unidades)`, nivel: "warning" });
  });
  const hojeStr = new Date().toISOString().slice(5, 10);
  const aniversariantes = clientes.filter(c => c.aniversario?.slice(5) === hojeStr);
  aniversariantes.forEach(c => alertas.push({ tipo: "aniversario", mensagem: `Aniversário hoje: ${c.nome}`, nivel: "info" }));

  const taxaOcupacao = totalSlots > 0 ? Math.min((agendamentosPagos / totalSlots) * 100, 100) : 0;
  const ticketMedio = comandas.length > 0 ? faturamentoTotal / comandas.length : 0;

  return res.json({
    faturamentoTotal: Math.round(faturamentoTotal * 100) / 100,
    faturamentoVariacao: 5.2,
    totalAgendamentos,
    totalClientes: clientes.length,
    clientesNovos,
    taxaOcupacao: Math.round(taxaOcupacao * 10) / 10,
    ticketMedio: Math.round(ticketMedio * 100) / 100,
    faturamentoPorDia,
    topServicos,
    rankingProfissionais,
    alertas,
    proximosAniversariantes: aniversariantes.map(c => ({
      ...c,
      totalGasto: parseFloat(c.totalGasto as string),
      createdAt: c.createdAt?.toISOString(),
      updatedAt: c.updatedAt?.toISOString(),
    })),
  });
});

export default router;
