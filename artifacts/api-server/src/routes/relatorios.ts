import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { comandasTable, profissionaisTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

router.get("/faturamento", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;
  if (!dataInicio || !dataFim) return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });

  const comandas = await db.select().from(comandasTable).where(
    and(
      eq(comandasTable.barbeariaId, barbeariaId),
      sql`DATE(${comandasTable.dataFechamento}) >= ${dataInicio}`,
      sql`DATE(${comandasTable.dataFechamento}) <= ${dataFim}`
    )
  );

  const totalBruto = comandas.reduce((s, c) => s + parseFloat(c.valorTotal as string), 0);
  const totalComissoes = comandas.reduce((s, c) => s + parseFloat(c.comissaoTotal as string), 0);
  const totalLiquido = totalBruto - totalComissoes;

  const dias: Record<string, { data: string; valor: number; quantidade: number }> = {};
  comandas.forEach(c => {
    const d = c.dataFechamento?.toISOString().slice(0, 10) ?? "";
    if (!dias[d]) dias[d] = { data: d, valor: 0, quantidade: 0 };
    dias[d].valor += parseFloat(c.valorTotal as string);
    dias[d].quantidade += 1;
  });

  const servicoMap: Record<string, { servicoId: number; nome: string; quantidade: number; valor: number }> = {};
  comandas.forEach(c => {
    const servs: any[] = (c.servicos as any) || [];
    servs.forEach(s => {
      if (!servicoMap[s.id]) servicoMap[s.id] = { servicoId: s.id, nome: s.nome, quantidade: 0, valor: 0 };
      servicoMap[s.id].quantidade += 1;
      servicoMap[s.id].valor += s.valor;
    });
  });

  const pagMap: Record<string, number> = {};
  comandas.forEach(c => {
    const pags: any[] = (c.pagamentos as any) || [];
    pags.forEach(p => {
      if (!pagMap[p.metodo]) pagMap[p.metodo] = 0;
      pagMap[p.metodo] += p.valor;
    });
  });

  return res.json({
    totalBruto: Math.round(totalBruto * 100) / 100,
    totalLiquido: Math.round(totalLiquido * 100) / 100,
    totalComissoes: Math.round(totalComissoes * 100) / 100,
    porDia: Object.values(dias).sort((a, b) => a.data.localeCompare(b.data)),
    porServico: Object.values(servicoMap).map(s => ({ ...s, percentual: totalBruto > 0 ? (s.valor / totalBruto) * 100 : 0 })).sort((a, b) => b.valor - a.valor),
    porFormaPagamento: Object.entries(pagMap).map(([metodo, valor]) => ({ metodo, valor })),
  });
});

router.get("/comissoes", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { mes } = req.query;
  if (!mes) return res.status(400).json({ error: "mes é obrigatório" });

  const [profissionais, comandas] = await Promise.all([
    db.select().from(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId)),
    db.select().from(comandasTable).where(and(eq(comandasTable.barbeariaId, barbeariaId), eq(comandasTable.mesAno, mes as string))),
  ]);

  const profMap: Record<number, { profissionalId: number; nome: string; totalAtendimentos: number; faturamentoBruto: number; comissaoTotal: number }> = {};
  profissionais.forEach(p => {
    profMap[p.id] = { profissionalId: p.id, nome: p.nomeExibicao, totalAtendimentos: 0, faturamentoBruto: 0, comissaoTotal: 0 };
  });
  comandas.forEach(c => {
    if (profMap[c.profissionalId]) {
      profMap[c.profissionalId].totalAtendimentos += 1;
      profMap[c.profissionalId].faturamentoBruto += parseFloat(c.valorTotal as string);
      profMap[c.profissionalId].comissaoTotal += parseFloat(c.comissaoTotal as string);
    }
  });

  return res.json(Object.values(profMap).map(p => ({
    ...p,
    percentualMedio: p.faturamentoBruto > 0 ? (p.comissaoTotal / p.faturamentoBruto) * 100 : 0,
  })));
});

export default router;
