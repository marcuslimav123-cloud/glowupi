import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  pacotesClienteTable, pacotesTable, agendamentosTable, profissionaisTable,
  servicosTable, profissionalServicosTable, bloqueiosHorarioTable, barbeariasTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";
import { validateAgendamentoEmHorario, validateAgendamentoEmJornadaProf } from "../lib/horarioValidation.js";

const router: IRouter = Router({ mergeParams: true });

function formatPC(pc: any, pacoteNome?: string) {
  return { ...pc, dataCompra: pc.dataCompra?.toISOString?.() ?? pc.dataCompra, dataValidade: pc.dataValidade?.toISOString?.() ?? pc.dataValidade, createdAt: pc.createdAt?.toISOString?.() ?? pc.createdAt, pacoteNome: pacoteNome || "" };
}

function formatAgend(a: any) {
  return {
    ...a,
    valor: parseFloat(a.valor),
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    updatedAt: a.updatedAt?.toISOString?.() ?? a.updatedAt,
  };
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60).toString().padStart(2, "0");
  const nm = (total % 60).toString().padStart(2, "0");
  return `${nh}:${nm}`;
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const items = await db.select().from(pacotesClienteTable).where(eq(pacotesClienteTable.barbeariaId, barbeariaId));
  const pacotes = await db.select().from(pacotesTable).where(eq(pacotesTable.barbeariaId, barbeariaId));
  const pacoteMap = Object.fromEntries(pacotes.map(p => [p.id, p.nome]));
  res.json(items.map(pc => formatPC(pc, pacoteMap[pc.pacoteId])));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const { pacoteId, clienteId, clienteNome } = req.body;
    if (!pacoteId) { return res.status(400).json({ error: "pacoteId é obrigatório" }); }
    if (!clienteNome) { return res.status(400).json({ error: "Nome do cliente é obrigatório" }); }
    const [pacote] = await db.select().from(pacotesTable).where(and(eq(pacotesTable.id, pacoteId), eq(pacotesTable.barbeariaId, barbeariaId))).limit(1);
    if (!pacote) { return res.status(404).json({ error: "Pacote não encontrado" }); }
    const dataValidade = pacote.validade ? new Date(Date.now() + pacote.validade * 86400000) : null;
    const [pc] = await db.insert(pacotesClienteTable).values({
      barbeariaId, pacoteId, clienteId: clienteId || null, clienteNome, sessoesTotal: pacote.sessoesTotal, dataValidade
    }).returning();
    return res.status(201).json(formatPC(pc, pacote.nome));
  } catch (err: unknown) {
    console.error("Erro ao vender pacote:", err);
    return res.status(500).json({ error: "Erro interno ao processar venda" });
  }
});

router.post("/:pacoteClienteId/usar", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const pcId = parseInt(req.params.pacoteClienteId);
  const [pc] = await db.select().from(pacotesClienteTable).where(and(eq(pacotesClienteTable.id, pcId), eq(pacotesClienteTable.barbeariaId, barbeariaId))).limit(1);
  if (!pc) { res.status(404).json({ error: "Não encontrado" }); return; }
  if (pc.sessoesUsadas >= pc.sessoesTotal) { res.status(400).json({ error: "Todas as sessões já foram usadas" }); return; }
  const newUsadas = pc.sessoesUsadas + 1;
  const newStatus = newUsadas >= pc.sessoesTotal ? "concluido" : "ativo";
  const [updated] = await db.update(pacotesClienteTable).set({ sessoesUsadas: newUsadas, status: newStatus }).where(eq(pacotesClienteTable.id, pcId)).returning();
  const [pacote] = await db.select().from(pacotesTable).where(eq(pacotesTable.id, updated.pacoteId)).limit(1);
  res.json(formatPC(updated, pacote?.nome));
});

router.post("/:pacoteClienteId/agendar", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const pcId = parseInt(req.params.pacoteClienteId);
  const { itens } = req.body;

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "Informe os itens a agendar" });
  }
  for (const it of itens) {
    if (!it.servicoId || !it.profissionalId || !it.data || !it.horaInicio) {
      return res.status(400).json({ error: "Cada item precisa de servicoId, profissionalId, data e horaInicio" });
    }
  }

  const [pc] = await db.select().from(pacotesClienteTable).where(
    and(eq(pacotesClienteTable.id, pcId), eq(pacotesClienteTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!pc) return res.status(404).json({ error: "Pacote vendido não encontrado" });

  const sessoesDisponiveis = pc.sessoesTotal - pc.sessoesUsadas;
  if (itens.length > sessoesDisponiveis) {
    return res.status(400).json({ error: `Pacote tem apenas ${sessoesDisponiveis} sessão(ões) disponível(is)` });
  }

  if (pc.dataValidade && new Date(pc.dataValidade) < new Date()) {
    return res.status(400).json({ error: "Pacote vencido" });
  }

  const [pacote] = await db.select().from(pacotesTable).where(eq(pacotesTable.id, pc.pacoteId)).limit(1);
  if (!pacote) return res.status(404).json({ error: "Pacote não encontrado" });

  // Validate scheduled services against pacote composition (when itens are structured).
  // pacote.itens may be: [] (loose) | [{ servicoId, sessoesIncluidas? }, ...]
  const pacoteItens = Array.isArray(pacote.itens) ? (pacote.itens as any[]) : [];
  const allowedCounts = new Map<number, number>();
  for (const it of pacoteItens) {
    const sid = Number(it?.servicoId ?? it?.id);
    if (Number.isFinite(sid) && sid > 0) {
      const qty = Number(it?.sessoesIncluidas ?? it?.quantidade ?? 1) || 1;
      allowedCounts.set(sid, (allowedCounts.get(sid) ?? 0) + qty);
    }
  }
  if (allowedCounts.size > 0) {
    // Count already-scheduled (active) sessions per servicoId for this pacoteCliente.
    const usedRows = await db.select({ servicoId: agendamentosTable.servicoId })
      .from(agendamentosTable)
      .where(and(
        eq(agendamentosTable.barbeariaId, barbeariaId),
        eq(agendamentosTable.pacoteClienteId, pc.id),
        inArray(agendamentosTable.status, ["confirmado", "pendente_aprovacao", "pago"]),
      ));
    const usedCounts = new Map<number, number>();
    for (const r of usedRows) usedCounts.set(r.servicoId, (usedCounts.get(r.servicoId) ?? 0) + 1);
    const submittedCounts = new Map<number, number>();
    for (const it of itens) submittedCounts.set(Number(it.servicoId), (submittedCounts.get(Number(it.servicoId)) ?? 0) + 1);
    for (const [sid, qty] of submittedCounts.entries()) {
      const allowed = allowedCounts.get(sid);
      if (allowed === undefined) {
        return res.status(400).json({ error: `Serviço ${sid} não pertence à composição deste pacote` });
      }
      const used = usedCounts.get(sid) ?? 0;
      if (used + qty > allowed) {
        return res.status(400).json({ error: `Limite de sessões do serviço ${sid} excedido (permitido: ${allowed}, já agendadas: ${used}, novas: ${qty})` });
      }
    }
  }

  const params = await getParametros(barbeariaId);
  const [barb] = await db.select({ horarioFuncionamento: barbeariasTable.horarioFuncionamento }).from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  const tempoPadraoStr = params["agenda_tempo_padrao"] || "30min";
  const tempoPadrao = tempoPadraoStr === "1h" ? 60 : (parseInt(tempoPadraoStr) || 30);

  type Resolved = { it: any; servico: any; profissional: any; horaFim: string; valor: string };
  const resolved: Resolved[] = [];

  for (const it of itens) {
    const [servico] = await db.select().from(servicosTable).where(
      and(eq(servicosTable.id, it.servicoId), eq(servicosTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!servico) return res.status(404).json({ error: `Serviço ${it.servicoId} não encontrado` });
    const [profissional] = await db.select().from(profissionaisTable).where(
      and(eq(profissionaisTable.id, it.profissionalId), eq(profissionaisTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!profissional) return res.status(404).json({ error: `Profissional ${it.profissionalId} não encontrado` });
    const [override] = await db.select().from(profissionalServicosTable).where(
      and(
        eq(profissionalServicosTable.profissionalId, it.profissionalId),
        eq(profissionalServicosTable.servicoId, it.servicoId),
        eq(profissionalServicosTable.barbeariaId, barbeariaId)
      )
    ).limit(1);
    const duracao = override?.tempoOverride ?? servico.duracaoMinutos ?? tempoPadrao;
    const horaFim = addMinutesToTime(it.horaInicio, duracao);
    const valor = override?.precoOverride != null ? override.precoOverride : servico.preco;

    const horarioErr = validateAgendamentoEmHorario(it.data, it.horaInicio, horaFim, (barb?.horarioFuncionamento as any));
    if (horarioErr) return res.status(400).json({ error: `${profissional.apelido || profissional.nomeExibicao}: ${horarioErr}` });
    if (profissional?.horarios) {
      const jornadaErr = validateAgendamentoEmJornadaProf(it.data, it.horaInicio, horaFim, profissional.horarios as any);
      if (jornadaErr) return res.status(400).json({ error: `${profissional.apelido || profissional.nomeExibicao}: ${jornadaErr}` });
    }
    const bloqueios = await db.select().from(bloqueiosHorarioTable).where(
      and(
        eq(bloqueiosHorarioTable.barbeariaId, barbeariaId),
        eq(bloqueiosHorarioTable.profissionalId, it.profissionalId),
        eq(bloqueiosHorarioTable.data, it.data),
      )
    );
    if (bloqueios.some(b => it.horaInicio < b.horaFim && horaFim > b.horaInicio)) {
      return res.status(409).json({ error: `Horário bloqueado para ${profissional.apelido || profissional.nomeExibicao} em ${it.data} às ${it.horaInicio}` });
    }
    const existing = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbeariaId),
        eq(agendamentosTable.profissionalId, it.profissionalId),
        eq(agendamentosTable.data, it.data),
        inArray(agendamentosTable.status, ["confirmado", "pendente_aprovacao"]),
      )
    );
    if (existing.some(a => it.horaInicio < a.horaFim && horaFim > a.horaInicio)) {
      return res.status(409).json({ error: `Conflito de horário para ${profissional.apelido || profissional.nomeExibicao} em ${it.data} às ${it.horaInicio}` });
    }
    resolved.push({ it, servico, profissional, horaFim, valor });
  }

  const result = await db.transaction(async (tx) => {
    const ags: any[] = [];
    for (const r of resolved) {
      const [agend] = await tx.insert(agendamentosTable).values({
        barbeariaId,
        clienteId: pc.clienteId || null,
        clienteNome: pc.clienteNome,
        clienteTelefone: "",
        profissionalId: r.profissional.id,
        profissionalNome: r.profissional.apelido || r.profissional.nomeExibicao,
        servicoId: r.servico.id,
        servicoNome: r.servico.nome,
        data: r.it.data,
        horaInicio: r.it.horaInicio,
        horaFim: r.horaFim,
        status: "confirmado",
        valor: r.valor,
        pago: false,
        semPreferencia: false,
        observacao: r.it.observacao || `Sessão de pacote: ${pacote.nome}`,
        aniversario: false,
        vip: false,
        encaixe: false,
        pacoteClienteId: pc.id,
        origem: "pacote",
      }).returning();
      ags.push(agend);
    }

    const newUsadas = pc.sessoesUsadas + resolved.length;
    const newStatus = newUsadas >= pc.sessoesTotal ? "concluido" : "ativo";
    const [updated] = await tx.update(pacotesClienteTable)
      .set({ sessoesUsadas: newUsadas, status: newStatus })
      .where(eq(pacotesClienteTable.id, pc.id))
      .returning();

    return { agendamentos: ags, pacoteCliente: updated };
  });

  return res.status(201).json({
    pacoteCliente: formatPC(result.pacoteCliente, pacote.nome),
    agendamentos: result.agendamentos.map(formatAgend),
  });
});

export default router;
