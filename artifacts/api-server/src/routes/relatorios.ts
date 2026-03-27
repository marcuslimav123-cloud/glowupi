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
    const servs = Array.isArray(c.servicos) ? c.servicos : [];
    servs.forEach(s => {
      if (!servicoMap[s.id]) servicoMap[s.id] = { servicoId: s.id, nome: s.nome, quantidade: 0, valor: 0 };
      servicoMap[s.id].quantidade += 1;
      servicoMap[s.id].valor += s.valor;
    });
  });

  const pagMap: Record<string, number> = {};
  comandas.forEach(c => {
    const pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
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
    porServico: Object.values(servicoMap).map(s => ({ ...s, percentual: totalBruto > 0 ? Math.round((s.valor / totalBruto) * 1000) / 10 : 0 })).sort((a, b) => b.valor - a.valor),
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
    percentualMedio: p.faturamentoBruto > 0 ? Math.round((p.comissaoTotal / p.faturamentoBruto) * 1000) / 10 : 0,
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

    const servs = Array.isArray(c.servicos) ? c.servicos : [];
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

router.get("/comandas-itens", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
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

  const items: { id: string; comandaId: number; clienteNome: string; servicoNome: string; profissionalNome: string; valor: number; data: string }[] = [];
  comandas.forEach(c => {
    const servs = Array.isArray(c.servicos) ? c.servicos : [];
    servs.forEach((s: Record<string, unknown>, idx: number) => {
      items.push({
        id: `${c.id}-${idx}`,
        comandaId: c.id,
        clienteNome: c.clienteNome || "—",
        servicoNome: (s.nome as string) || "—",
        profissionalNome: (s.profissionalNome as string) || "—",
        valor: Number(s.valor) || 0,
        data: c.dataFechamento?.toISOString().slice(0, 10) || "",
      });
    });
  });

  return res.json(items);
});

router.get("/estoque", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;

  const produtos = await db.select().from(produtosTable).where(eq(produtosTable.barbeariaId, barbeariaId));

  return res.json(produtos.map(p => ({
    id: p.id,
    nome: p.nome,
    categoria: null,
    quantidade: p.quantidade,
    precoVenda: parseFloat(p.preco as string),
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

router.get("/dias-sem-vir", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const diasMinimo = parseInt(req.query.dias as string) || 30;

  const clientes = await db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));
  const agendamentos = await db.select({
    clienteId: agendamentosTable.clienteId,
    data: agendamentosTable.data,
  }).from(agendamentosTable).where(eq(agendamentosTable.barbeariaId, barbeariaId));

  const ultimoAgendamento: Record<number, string> = {};
  agendamentos.forEach(a => {
    if (a.clienteId != null) {
      if (!ultimoAgendamento[a.clienteId] || a.data > ultimoAgendamento[a.clienteId]) {
        ultimoAgendamento[a.clienteId] = a.data;
      }
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = clientes.map(c => {
    const ultima = ultimoAgendamento[c.id];
    if (!ultima) {
      return { id: c.id, nome: c.nome, telefone: c.telefone, email: c.email, ultimoAgendamento: null, diasSemVir: 9999, vip: c.vip };
    }
    const diff = Math.floor((today.getTime() - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24));
    return { id: c.id, nome: c.nome, telefone: c.telefone, email: c.email, ultimoAgendamento: ultima, diasSemVir: diff, vip: c.vip };
  }).filter(c => c.diasSemVir >= diasMinimo).sort((a, b) => b.diasSemVir - a.diasSemVir);

  return res.json(result);
});

router.get("/lucro-produtos", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { dataInicio, dataFim } = req.query;
  if (!dataInicio || !dataFim) return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });

  const [comandas, produtos] = await Promise.all([
    db.select().from(comandasTable).where(
      and(
        eq(comandasTable.barbeariaId, barbeariaId),
        sql`DATE(${comandasTable.dataFechamento}) >= ${dataInicio}`,
        sql`DATE(${comandasTable.dataFechamento}) <= ${dataFim}`
      )
    ),
    db.select().from(produtosTable).where(eq(produtosTable.barbeariaId, barbeariaId)),
  ]);

  const produtoMap = Object.fromEntries(produtos.map(p => [p.nome, { custo: parseFloat(p.custo ?? "0") }]));

  const vendas: Record<string, { nome: string; qtd: number; receita: number; custo: number; comissao: number }> = {};
  comandas.forEach(c => {
    const prods = Array.isArray(c.produtos) ? c.produtos : [];
    const comissaoTotal = parseFloat(c.comissaoTotal as string) || 0;
    const valorTotal = parseFloat(c.valorTotal as string) || 0;

    (prods as Array<{ nome: string; valor: number; quantidade?: number }>).forEach(p => {
      if (!p.nome) return;
      if (!vendas[p.nome]) vendas[p.nome] = { nome: p.nome, qtd: 0, receita: 0, custo: 0, comissao: 0 };
      const qty = p.quantidade ?? 1;
      const itemValor = Number(p.valor) || 0;
      vendas[p.nome].qtd += qty;
      vendas[p.nome].receita += itemValor;
      const info = produtoMap[p.nome];
      if (info) {
        vendas[p.nome].custo += info.custo * qty;
      }
      if (valorTotal > 0 && comissaoTotal > 0) {
        vendas[p.nome].comissao += (itemValor / valorTotal) * comissaoTotal;
      }
    });
  });

  const result = Object.values(vendas).map(v => ({
    ...v,
    comissao: Math.round(v.comissao * 100) / 100,
    lucro: Math.round((v.receita - v.custo - v.comissao) * 100) / 100,
    margem: v.receita > 0 ? Math.round(((v.receita - v.custo - v.comissao) / v.receita) * 1000) / 10 : 0,
  })).sort((a, b) => b.lucro - a.lucro);

  return res.json(result);
});

export default router;
