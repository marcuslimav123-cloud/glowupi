import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  comandasTable, profissionaisTable, barbeariasTable,
  agendamentosTable, clientesTable, produtosTable,
  contasFinanceirasTable, servicosTable, pacotesTable, pacotesClienteTable
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
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

router.get("/aniversariantes", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;
  if (!dataInicio || !dataFim) return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });

  const clientes = await db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));
  const start = dataInicio as string;
  const end = dataFim as string;

  const result = clientes.filter(c => {
    if (!c.aniversario) return false;
    const mmdd = c.aniversario.slice(5);
    const thisYear = start.slice(0, 4);
    const testDate = `${thisYear}-${mmdd}`;
    return testDate >= start && testDate <= end;
  }).map(c => {
    const mmdd = c.aniversario!.slice(5);
    const thisYear = start.slice(0, 4);
    const bday = new Date(`${thisYear}-${mmdd}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = bday.getTime() - today.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return {
      id: c.id,
      imagem: null,
      nome: c.nome,
      telefone: c.telefone,
      celular: c.telefone,
      aniversario: c.aniversario,
      diasAte: diffDias,
    };
  }).sort((a, b) => a.diasAte - b.diasAte);

  return res.json(result);
});

router.get("/agendamentos-report", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;
  if (!dataInicio || !dataFim) return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });

  const agendamentos = await db.select().from(agendamentosTable).where(
    and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      gte(agendamentosTable.data, dataInicio as string),
      lte(agendamentosTable.data, dataFim as string),
    )
  );

  return res.json(agendamentos.map(a => ({
    id: a.id,
    data: a.data,
    horaInicio: a.horaInicio,
    horaFim: a.horaFim,
    clienteNome: a.clienteNome,
    profissionalNome: a.profissionalNome,
    servicoNome: a.servicoNome,
    status: a.status,
    valor: parseFloat(a.valor as string),
    pago: a.pago,
    encaixe: a.encaixe,
  })));
});

router.get("/financeiro-report", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;
  if (!dataInicio || !dataFim) return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });

  const contas = await db.select().from(contasFinanceirasTable).where(
    and(
      eq(contasFinanceirasTable.barbeariaId, barbeariaId),
      gte(contasFinanceirasTable.dataVencimento, dataInicio as string),
      lte(contasFinanceirasTable.dataVencimento, dataFim as string),
    )
  );

  return res.json(contas.map(c => ({
    id: c.id,
    tipo: c.tipo,
    categoria: c.categoria,
    descricao: c.descricao,
    valor: parseFloat(c.valor as string),
    dataVencimento: c.dataVencimento,
    dataPagamento: c.dataPagamento,
    status: c.status,
  })));
});

router.get("/comandas-canceladas", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;
  if (!dataInicio || !dataFim) return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });

  const agendamentos = await db.select().from(agendamentosTable).where(
    and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      eq(agendamentosTable.status, "cancelado"),
      gte(agendamentosTable.data, dataInicio as string),
      lte(agendamentosTable.data, dataFim as string),
    )
  );

  return res.json(agendamentos.map(a => ({
    id: a.id,
    data: a.data,
    horaInicio: a.horaInicio,
    clienteNome: a.clienteNome,
    profissionalNome: a.profissionalNome,
    servicoNome: a.servicoNome,
    valor: parseFloat(a.valor as string),
  })));
});

router.get("/rankings", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
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

  const profMap: Record<string, { nome: string; atendimentos: number; faturamento: number }> = {};
  const servMap: Record<string, { nome: string; quantidade: number; faturamento: number }> = {};

  comandas.forEach(c => {
    const key = c.profissionalNome;
    if (!profMap[key]) profMap[key] = { nome: key, atendimentos: 0, faturamento: 0 };
    profMap[key].atendimentos += 1;
    profMap[key].faturamento += parseFloat(c.valorTotal as string);

    const servs: any[] = (c.servicos as any) || [];
    servs.forEach(s => {
      if (!servMap[s.nome]) servMap[s.nome] = { nome: s.nome, quantidade: 0, faturamento: 0 };
      servMap[s.nome].quantidade += 1;
      servMap[s.nome].faturamento += s.valor;
    });
  });

  return res.json({
    profissionais: Object.values(profMap).sort((a, b) => b.faturamento - a.faturamento),
    servicos: Object.values(servMap).sort((a, b) => b.faturamento - a.faturamento),
  });
});

router.get("/perfil-cliente", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;

  const clientes = await db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));

  const filtered = clientes.filter(c => {
    if (!dataInicio || !dataFim) return true;
    const created = c.createdAt ? c.createdAt.toISOString().slice(0, 10) : "";
    return created >= (dataInicio as string) && created <= (dataFim as string);
  });

  return res.json(filtered.map(c => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    aniversario: c.aniversario,
    vip: c.vip,
    pontosFidelidade: c.pontosFidelidade,
    totalGasto: parseFloat(c.totalGasto as string),
    ultimaVisita: c.ultimaVisita,
    createdAt: c.createdAt?.toISOString(),
  })));
});

router.get("/estoque", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;

  const produtos = await db.select().from(produtosTable).where(eq(produtosTable.barbeariaId, barbeariaId));

  return res.json(produtos.map(p => ({
    id: p.id,
    nome: p.nome,
    categoria: (p as any).categoria || null,
    quantidade: p.quantidade,
    precoVenda: parseFloat(p.precoVenda as string),
    validade: p.validade,
    ativo: p.ativo,
  })));
});

router.get("/pacotes", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;

  const [pacotes, vendas] = await Promise.all([
    db.select().from(pacotesTable).where(eq(pacotesTable.barbeariaId, barbeariaId)),
    db.select().from(pacotesClienteTable).where(eq(pacotesClienteTable.barbeariaId, barbeariaId)),
  ]);

  const pacoteMap = Object.fromEntries(pacotes.map(p => [p.id, p]));

  const filtered = vendas.filter(v => {
    if (!dataInicio || !dataFim) return true;
    const d = v.dataCompra ? v.dataCompra.toISOString().slice(0, 10) : "";
    return d >= (dataInicio as string) && d <= (dataFim as string);
  });

  return res.json(filtered.map(v => {
    const pac = pacoteMap[v.pacoteId];
    return {
      id: v.id,
      nome: pac?.nome || "—",
      clienteNome: v.clienteNome,
      valorTotal: pac ? parseFloat(pac.preco as string) : 0,
      sessoes: v.sessoesTotal,
      sessoesUsadas: v.sessoesUsadas,
      status: v.status,
      dataVenda: v.dataCompra?.toISOString().slice(0, 10) || "",
    };
  }));
});

export default router;
