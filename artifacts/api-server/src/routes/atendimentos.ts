import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  agendamentosTable, atendimentosTable, barbeariasTable, profissionaisTable,
  servicosTable, clientesTable, profissionalServicosTable,
  bloqueiosHorarioTable, pacotesTable, pacotesClienteTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";
import { sendPushToBarbearia } from "../lib/pushNotifications.js";
import { validateAgendamentoEmHorario, validateAgendamentoEmJornadaProf } from "../lib/horarioValidation.js";

const router: IRouter = Router({ mergeParams: true });

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60).toString().padStart(2, "0");
  const nm = (total % 60).toString().padStart(2, "0");
  return `${nh}:${nm}`;
}

function formatAgend(a: any) {
  return {
    ...a,
    valor: parseFloat(a.valor),
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    updatedAt: a.updatedAt?.toISOString?.() ?? a.updatedAt,
  };
}

function formatAtend(a: any) {
  return {
    ...a,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

router.get("/:atendimentoId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.atendimentoId);
  const [atend] = await db.select().from(atendimentosTable).where(
    and(eq(atendimentosTable.id, id), eq(atendimentosTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!atend) return res.status(404).json({ error: "Atendimento não encontrado" });
  const ags = await db.select().from(agendamentosTable).where(
    and(eq(agendamentosTable.barbeariaId, barbeariaId), eq(agendamentosTable.atendimentoId, id))
  );
  return res.json({ atendimento: formatAtend(atend), agendamentos: ags.map(formatAgend) });
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = req.user;
  const { clienteId, clienteNome, clienteTelefone, data, horaInicio, observacao, encaixe, itens, pacoteClienteId } = req.body;
  if (!clienteNome || !clienteTelefone || !data || !horaInicio || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  for (const it of itens) {
    if (!it || !it.servicoId || !it.profissionalId) {
      return res.status(400).json({ error: "Cada item precisa de serviço e profissional" });
    }
  }

  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador") {
    if (!user.profissionalId) return res.status(403).json({ error: "Acesso negado" });
    const ehDoColab = itens.every((it: any) => it.profissionalId === user.profissionalId);
    if (!ehDoColab) {
      return res.status(403).json({ error: "Profissionais não-gestores só podem criar atendimentos para si mesmos" });
    }
  }

  if (encaixe && user.role === "colaborador" && params["comanda_encaixes_nao_gestor"] === "Sim") {
    return res.status(403).json({ error: "Criação de encaixes não permitida para profissionais não-gestores" });
  }

  const [barb] = await db.select({ horarioFuncionamento: barbeariasTable.horarioFuncionamento }).from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);

  const tempoPadraoStr = params["agenda_tempo_padrao"] || "30min";
  const tempoPadrao = tempoPadraoStr === "1h" ? 60 : (parseInt(tempoPadraoStr) || 30);

  const itensResolvidos: Array<{ servico: any; profissional: any; override: any; horaFim: string; valor: string; }> = [];
  for (const it of itens) {
    const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, it.servicoId), eq(servicosTable.barbeariaId, barbeariaId))).limit(1);
    if (!servico) return res.status(404).json({ error: `Serviço ${it.servicoId} não encontrado` });
    const [profissional] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, it.profissionalId), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
    if (!profissional) return res.status(404).json({ error: `Profissional ${it.profissionalId} não encontrado` });
    const [override] = await db.select().from(profissionalServicosTable).where(
      and(
        eq(profissionalServicosTable.profissionalId, it.profissionalId),
        eq(profissionalServicosTable.servicoId, it.servicoId),
        eq(profissionalServicosTable.barbeariaId, barbeariaId)
      )
    ).limit(1);
    const duracao = override?.tempoOverride ?? servico.duracaoMinutos ?? tempoPadrao;
    const horaFim = addMinutesToTime(horaInicio, duracao);
    const valor = override?.precoOverride != null ? override.precoOverride : servico.preco;

    if (!encaixe) {
      const horarioErr = validateAgendamentoEmHorario(data, horaInicio, horaFim, (barb?.horarioFuncionamento as any));
      if (horarioErr) return res.status(400).json({ error: horarioErr });
      if (profissional?.horarios) {
        const jornadaErr = validateAgendamentoEmJornadaProf(data, horaInicio, horaFim, profissional.horarios as any);
        if (jornadaErr) return res.status(400).json({ error: jornadaErr });
      }
      const bloqueios = await db.select().from(bloqueiosHorarioTable).where(
        and(
          eq(bloqueiosHorarioTable.barbeariaId, barbeariaId),
          eq(bloqueiosHorarioTable.profissionalId, it.profissionalId),
          eq(bloqueiosHorarioTable.data, data),
        )
      );
      const blocked = bloqueios.some(b => horaInicio < b.horaFim && horaFim > b.horaInicio);
      if (blocked) {
        return res.status(409).json({ error: `Horário bloqueado para ${profissional.apelido || profissional.nomeExibicao}` });
      }
      const existing = await db.select().from(agendamentosTable).where(
        and(
          eq(agendamentosTable.barbeariaId, barbeariaId),
          eq(agendamentosTable.profissionalId, it.profissionalId),
          eq(agendamentosTable.data, data),
          inArray(agendamentosTable.status, ["confirmado", "pendente_aprovacao"]),
        )
      );
      const conflict = existing.some(a => horaInicio < a.horaFim && horaFim > a.horaInicio);
      if (conflict) {
        return res.status(409).json({ error: `Já existe um agendamento neste horário para ${profissional.apelido || profissional.nomeExibicao}` });
      }
    }
    itensResolvidos.push({ servico, profissional, override, horaFim, valor });
  }

  let isAniversario = false;
  if (clienteId) {
    const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, clienteId)).limit(1);
    if (cliente?.aniversario) {
      const aniv = cliente.aniversario.slice(5);
      isAniversario = data.slice(5) === aniv;
    }
  }

  const modoConfirmacao = params["agenda_modo_confirmacao"] || "Automatica";
  const isManualMode = modoConfirmacao === "Manual_dono" || modoConfirmacao === "Manual_profissional";
  const statusInicial = isManualMode ? "pendente_aprovacao" : "confirmado";

  let pacoteClienteValido: number | null = null;
  if (pacoteClienteId) {
    const [pc] = await db.select().from(pacotesClienteTable).where(
      and(eq(pacotesClienteTable.id, pacoteClienteId), eq(pacotesClienteTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (pc) pacoteClienteValido = pc.id;
  }

  const result = await db.transaction(async (tx) => {
    const [atend] = await tx.insert(atendimentosTable).values({
      barbeariaId,
      clienteId: clienteId || null,
      clienteNome,
      clienteTelefone,
      data,
      horaInicio,
      observacao: observacao || null,
      pacoteClienteId: pacoteClienteValido,
    }).returning();

    const ags: any[] = [];
    for (const it of itensResolvidos) {
      const [agend] = await tx.insert(agendamentosTable).values({
        barbeariaId,
        clienteId: clienteId || null,
        clienteNome,
        clienteTelefone,
        profissionalId: it.profissional.id,
        profissionalNome: it.profissional.apelido || it.profissional.nomeExibicao,
        servicoId: it.servico.id,
        servicoNome: it.servico.nome,
        data,
        horaInicio,
        horaFim: it.horaFim,
        status: statusInicial,
        valor: it.valor,
        pago: false,
        semPreferencia: false,
        observacao: observacao || null,
        aniversario: isAniversario,
        vip: false,
        encaixe: encaixe ?? false,
        pacoteClienteId: pacoteClienteValido,
        atendimentoId: atend.id,
        origem: "manual",
      }).returning();
      ags.push(agend);
    }

    return { atend, ags };
  });

  sendPushToBarbearia(barbeariaId, {
    title: "Atendimento conjunto criado",
    body: `${clienteNome} — ${itensResolvidos.length} serviços em ${data} às ${horaInicio}`,
    data: { atendimentoId: result.atend.id, type: "new_atendimento", url: "/agenda" },
  }).catch(err => console.error("[Push] Error on new atendimento:", err));

  return res.status(201).json({
    atendimento: formatAtend(result.atend),
    agendamentos: result.ags.map(formatAgend),
  });
});

export default router;
