import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientesTable, barbeariasTable, agendamentosTable, comandasTable } from "@workspace/db/schema";
import { eq, and, ilike, or, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function formatCliente(c: any) {
  return { ...c, totalGasto: parseFloat(c.totalGasto), createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt };
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador" && (params["cliente_mostrar_lista_app"] || "Sim") !== "Sim") {
    return res.status(403).json({ error: "Listagem de clientes não permitida para seu perfil" });
  }

  const search = req.query.search as string;
  let clientes;
  if (search) {
    clientes = await db.select().from(clientesTable).where(and(eq(clientesTable.barbeariaId, barbeariaId), or(ilike(clientesTable.nome, `%${search}%`), ilike(clientesTable.telefone, `%${search}%`))));
  } else {
    clientes = await db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));
  }

  const hidePhone = user.role === "colaborador" && params["cliente_nao_mostrar_telefone"] === "Sim";
  return res.json(clientes.map(c => {
    const formatted = formatCliente(c);
    if (hidePhone) {
      delete formatted.telefone;
    }
    return formatted;
  }));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador" && params["cliente_cadastro_nao_gestor"] !== "Sim") {
    return res.status(403).json({ error: "Cadastro de cliente não permitido para seu perfil" });
  }

  const { nome, telefone, email, aniversario, observacoes, vip } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: "Nome e telefone são obrigatórios" });

  if (params["cliente_controle_celular"] === "Sim") {
    const existente = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbeariaId), eq(clientesTable.telefone, telefone))
    );
    if (existente.length > 0) {
      return res.status(409).json({ error: "Já existe um cliente cadastrado com este número de celular" });
    }
  }

  const autoAprovar = params["cliente_aprovar_cadastro_auto"] !== "Não";
  const statusInicial = autoAprovar ? "aprovado" : "pendente";

  const [cliente] = await db.insert(clientesTable).values({
    barbeariaId,
    nome,
    telefone,
    email: email || null,
    aniversario: aniversario || null,
    observacoes: observacoes || null,
    vip: vip ?? false,
    status: statusInicial,
  }).returning();
  return res.status(201).json(formatCliente(cliente));
});

router.get("/:clienteId/dashboard", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);

  const [cliente] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

  const agendamentos = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.barbeariaId, barbeariaId), eq(agendamentosTable.clienteId, clienteId))).orderBy(desc(agendamentosTable.data));

  const agendamentoIds = agendamentos.map(a => a.id);
  const comandas = agendamentoIds.length > 0
    ? await db.select().from(comandasTable).where(and(eq(comandasTable.barbeariaId, barbeariaId), inArray(comandasTable.agendamentoId, agendamentoIds))).orderBy(desc(comandasTable.dataFechamento))
    : [];

  const servicoCount: Record<string, number> = {};
  const produtoCount: Record<string, number> = {};

  agendamentos.forEach(a => {
    servicoCount[a.servicoNome] = (servicoCount[a.servicoNome] || 0) + 1;
  });

  comandas.forEach(c => {
    const prods = Array.isArray(c.produtos) ? c.produtos : [];
    (prods as Array<{ nome: string; quantidade?: number }>).forEach(p => {
      if (p.nome) produtoCount[p.nome] = (produtoCount[p.nome] || 0) + (p.quantidade ?? 1);
    });
  });

  const servicoMaisRealizado = Object.entries(servicoCount).sort((a, b) => b[1] - a[1])[0] ?? null;
  const produtoMaisComprado = Object.entries(produtoCount).sort((a, b) => b[1] - a[1])[0] ?? null;

  const ultimoAgendamento = agendamentos[0] ?? null;
  let diasSemAgendar: number | null = null;
  if (ultimoAgendamento) {
    const diff = Date.now() - new Date(ultimoAgendamento.data).getTime();
    diasSemAgendar = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return res.json({
    cliente: formatCliente(cliente),
    servicoMaisRealizado: servicoMaisRealizado ? { nome: servicoMaisRealizado[0], vezes: servicoMaisRealizado[1] } : null,
    produtoMaisComprado: produtoMaisComprado ? { nome: produtoMaisComprado[0], vezes: produtoMaisComprado[1] } : null,
    diasSemAgendar,
    totalGasto: parseFloat(cliente.totalGasto as string),
    pontosFidelidade: cliente.pontosFidelidade,
    totalAgendamentos: agendamentos.length,
    totalComandas: comandas.length,
  });
});

router.get("/:clienteId/agendamentos", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const status = req.query.status as string | undefined;
  const dataInicio = req.query.dataInicio as string | undefined;
  const dataFim = req.query.dataFim as string | undefined;

  const conditions = [eq(agendamentosTable.barbeariaId, barbeariaId), eq(agendamentosTable.clienteId, clienteId)];
  if (status) conditions.push(eq(agendamentosTable.status, status));
  if (dataInicio) conditions.push(sql`${agendamentosTable.data} >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`${agendamentosTable.data} <= ${dataFim}`);

  const allRows = await db.select().from(agendamentosTable).where(and(...conditions)).orderBy(desc(agendamentosTable.data));
  const total = allRows.length;
  const offset = (page - 1) * limit;
  const items = allRows.slice(offset, offset + limit);

  return res.json({
    items: items.map(a => ({
      id: a.id, data: a.data, horaInicio: a.horaInicio, horaFim: a.horaFim,
      servicoNome: a.servicoNome, profissionalNome: a.profissionalNome,
      status: a.status, valor: parseFloat(a.valor as string),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/:clienteId/comandas", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const dataInicio = req.query.dataInicio as string | undefined;
  const dataFim = req.query.dataFim as string | undefined;

  const agendamentoIds = (await db.select({ id: agendamentosTable.id }).from(agendamentosTable)
    .where(and(eq(agendamentosTable.barbeariaId, barbeariaId), eq(agendamentosTable.clienteId, clienteId)))).map(a => a.id);

  if (agendamentoIds.length === 0) {
    return res.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }

  const conditions = [eq(comandasTable.barbeariaId, barbeariaId), inArray(comandasTable.agendamentoId, agendamentoIds)];
  if (dataInicio) conditions.push(sql`DATE(${comandasTable.dataFechamento}) >= ${dataInicio}`);
  if (dataFim) conditions.push(sql`DATE(${comandasTable.dataFechamento}) <= ${dataFim}`);

  const allRows = await db.select().from(comandasTable).where(and(...conditions)).orderBy(desc(comandasTable.dataFechamento));
  const total = allRows.length;
  const offset = (page - 1) * limit;
  const items = allRows.slice(offset, offset + limit);

  return res.json({
    items: items.map(c => ({
      id: c.id, dataFechamento: c.dataFechamento?.toISOString(),
      profissionalNome: c.profissionalNome,
      valorTotal: parseFloat(c.valorTotal as string),
      pagamentos: c.pagamentos,
      servicos: c.servicos,
      produtos: c.produtos,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/:clienteId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador" && (params["cliente_mostrar_lista_app"] || "Sim") !== "Sim") {
    return res.status(403).json({ error: "Acesso a clientes não permitido para seu perfil" });
  }

  const id = parseInt(req.params.clienteId);
  const [cliente] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, id), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
  const formatted = formatCliente(cliente);
  if (user.role === "colaborador" && params["cliente_nao_mostrar_telefone"] === "Sim") {
    delete formatted.telefone;
  }
  return res.json(formatted);
});

router.put("/:clienteId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.clienteId);
  const { nome, telefone, email, aniversario, observacoes, vip } = req.body;
  const [existing] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, id), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Cliente não encontrado" });
  const [updated] = await db.update(clientesTable).set({
    nome: nome ?? existing.nome,
    telefone: telefone ?? existing.telefone,
    email: email ?? existing.email,
    aniversario: aniversario ?? existing.aniversario,
    observacoes: observacoes ?? existing.observacoes,
    vip: vip !== undefined ? vip : existing.vip,
    updatedAt: new Date(),
  }).where(eq(clientesTable.id, id)).returning();
  return res.json(formatCliente(updated));
});

export default router;
