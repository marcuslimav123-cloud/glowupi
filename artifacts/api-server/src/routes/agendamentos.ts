import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  agendamentosTable, barbeariasTable, profissionaisTable,
  servicosTable, clientesTable, comandasTable, produtosTable,
  bloqueiosHorarioTable, profissionalServicosTable,
  tiposTable, contasProfissionalTable, pesquisaSatisfacaoTable,
  respostasPesquisaTable, pacotesTable, pacotesClienteTable,
  assinantesTable, resgatesTable, usersTable
} from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";
import { sendEmail } from "../lib/brevo.js";

async function notificarAgendamento(barbeariaId: number, params: Record<string, string>, agendData: { clienteNome: string; clienteTelefone?: string; profissionalNome: string; servicoNome: string; data: string; horaInicio: string; clienteId?: number | null; agendamentoId?: number }, tipo: "criado" | "cancelado") {
  try {
    const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
    const nomeEstab = barb?.nome || "Glow Up";
    const assunto = tipo === "criado"
      ? `${nomeEstab} — Agendamento Confirmado`
      : `${nomeEstab} — Agendamento Cancelado`;
    const mensagem = tipo === "criado"
      ? `Seu agendamento de <strong>${agendData.servicoNome}</strong> com <strong>${agendData.profissionalNome}</strong> em ${agendData.data} às ${agendData.horaInicio} foi confirmado.`
      : `Seu agendamento de <strong>${agendData.servicoNome}</strong> com <strong>${agendData.profissionalNome}</strong> em ${agendData.data} às ${agendData.horaInicio} foi cancelado.`;

    const clienteNotifHabilitada = (params["notif_mensagem_agendar_cancelar"] || "Habilitado") === "Habilitado";
    const suprimirConfirmacao = tipo === "criado" && params["notif_nao_enviar_confirmacao"] === "Sim";
    const devEnviarCliente = clienteNotifHabilitada && !suprimirConfirmacao;

    if (devEnviarCliente && agendData.clienteId) {
      const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, agendData.clienteId)).limit(1);
      if (cliente?.email) {
        const tempoLembrete = params["notif_tempo_lembrete"] || "24";
        const incluirLink = (params["notif_link_confirmacao"] || "Sim") === "Sim";
        const usaSms = params["notif_lembrete_sms"] === "Sim";
        const usaWhatsapp = params["notif_lembrete_whatsapp"] === "Sim";

        let rodape = "";
        if (tipo === "criado") {
          if (incluirLink) {
            const domain = process.env.REPLIT_DEV_DOMAIN || "glowup.app";
            const confirmUrl = `https://${domain}/confirmar/${agendData.agendamentoId || 0}`;
            rodape += `<p style="margin-top:16px;"><a href="${confirmUrl}" style="display:inline-block;padding:10px 24px;background:#c4a46a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar Agendamento</a></p>`;
          }
          rodape += `<p style="font-size:12px;color:rgba(0,0,0,0.4);margin-top:12px;">Você receberá um lembrete ${tempoLembrete}h antes do horário</p>`;
          const canaisExtra = [usaSms ? "SMS" : "", usaWhatsapp ? "WhatsApp" : ""].filter(Boolean);
          if (canaisExtra.length > 0) {
            rodape += `<p style="font-size:12px;color:rgba(0,0,0,0.4);">Lembrete também via: ${canaisExtra.join(" e ")}</p>`;
          }
        }
        await sendEmail({
          to: [{ email: cliente.email, name: agendData.clienteNome }],
          subject: assunto,
          htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>${mensagem}</p>${rodape}</div>`,
        });
      }
    }

    const gestorNotifHabilitada = (params["notif_mensagem_gestores"] || "Habilitado") === "Habilitado";
    if (gestorNotifHabilitada) {
      const gestores = await db.select().from(usersTable).where(
        and(eq(usersTable.barbeariaId, barbeariaId), eq(usersTable.role, "gerente"))
      );
      const donoUsers = await db.select().from(usersTable).where(eq(usersTable.role, "dono"));
      const allGestores = [...gestores];
      for (const d of donoUsers) {
        if (d.barbeariaId) continue;
        const [b] = await db.select({ id: barbeariasTable.id }).from(barbeariasTable).where(eq(barbeariasTable.donoId, d.id)).limit(1);
        if (b?.id === barbeariaId) allGestores.push(d);
      }
      for (const g of allGestores) {
        if (g.email) {
          await sendEmail({
            to: [{ email: g.email, name: g.name || "Gestor" }],
            subject: `${nomeEstab} — Agendamento ${tipo === "criado" ? "criado" : "cancelado"}: ${agendData.clienteNome}`,
            htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>${mensagem}</p><p style="color:rgba(0,0,0,0.5);font-size:12px;">Notificação automática para gestores</p></div>`,
          });
        }
      }
    }
  } catch (err) {
    console.error(`[Notif] Erro ao notificar agendamento ${tipo}:`, err);
  }
}

const router: IRouter = Router({ mergeParams: true });

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function calcPontosFromPagamentos(barbeariaId: number, pagamentos: any[], valorTotal: number): Promise<number> {
  const formasPagamento = await db.select().from(tiposTable).where(
    and(eq(tiposTable.barbeariaId, barbeariaId), eq(tiposTable.categoria, "forma_pagamento"))
  );
  let totalPontos = 0;
  for (const pag of pagamentos) {
    const pagValor = Number(pag.valor) || 0;
    if (pagValor <= 0) continue;
    let mult = 1;
    if (pag.metodo) {
      const match = formasPagamento.find(f => f.nome.toLowerCase() === pag.metodo.toLowerCase() || f.nome.toLowerCase().includes(pag.metodo.toLowerCase()));
      if (match && match.multiplicadorPontos) {
        mult = parseFloat(match.multiplicadorPontos) || 1;
      }
    }
    totalPontos += Math.floor(pagValor / 10 * mult);
  }
  if (totalPontos === 0 && valorTotal > 0) {
    totalPontos = Math.floor(valorTotal / 10);
  }
  return totalPontos;
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

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  if (user.role === "colaborador" && !user.profissionalId) {
    return res.json([]);
  }
  const { data, profissionalId, status, dataInicio, dataFim } = req.query;
  const scopedProfId = user.role === "colaborador"
    ? user.profissionalId
    : (profissionalId ? parseInt(profissionalId as string) : undefined);
  const agendamentos = await db.select().from(agendamentosTable).where(
    and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      data ? eq(agendamentosTable.data, data as string) : undefined,
      dataInicio ? gte(agendamentosTable.data, dataInicio as string) : undefined,
      dataFim ? lte(agendamentosTable.data, dataFim as string) : undefined,
      scopedProfId ? eq(agendamentosTable.profissionalId, scopedProfId) : undefined,
      status ? eq(agendamentosTable.status, status as string) : undefined,
    )
  );
  return res.json(agendamentos.map(formatAgend));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const { clienteId, clienteNome, clienteTelefone, profissionalId, servicoId, data, horaInicio, semPreferencia, observacao, encaixe, origem } = req.body;
  if (!clienteNome || !clienteTelefone || !profissionalId || !servicoId || !data || !horaInicio) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  if (user.role === "colaborador" && (!user.profissionalId || profissionalId !== user.profissionalId)) {
    return res.status(403).json({ error: "Você só pode criar agendamentos para si mesma" });
  }
  const params = await getParametros(barbeariaId);

  if (encaixe && user.role === "colaborador" && params["comanda_encaixes_nao_gestor"] === "Sim") {
    return res.status(403).json({ error: "Criação de encaixes não permitida para profissionais não-gestores" });
  }

  if (params["agenda_nao_agendar_profissional"] === "Sim" && user.role === "colaborador") {
    return res.status(403).json({ error: "Agendamento bloqueado para profissionais não-gestores" });
  }

  const limiteFuturoDias = parseInt(params["agenda_limite_futuro_dias"] || "30");
  const dataAgend = new Date(data + "T12:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((dataAgend.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias > limiteFuturoDias) {
    return res.status(400).json({ error: `Agendamento não pode exceder ${limiteFuturoDias} dias no futuro` });
  }

  const limitePassadoDias = parseInt(params["agenda_limite_passado"] || "7");
  if (diffDias < 0 && Math.abs(diffDias) > limitePassadoDias) {
    return res.status(400).json({ error: `Agendamento não pode exceder ${limitePassadoDias} dias no passado` });
  }

  if (user.role === "colaborador") {
    if (params["cliente_agendar_sem_cliente"] === "Sim" && !clienteId) {
      return res.status(400).json({ error: "Seleção de cliente é obrigatória" });
    }
  }

  if (clienteId) {
    const limiteAbertos = parseInt(params["agenda_limite_abertos_cliente"] || "5");
    const abertos = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbeariaId),
        eq(agendamentosTable.clienteId, clienteId),
        eq(agendamentosTable.status, "confirmado"),
        gte(agendamentosTable.data, hoje.toISOString().slice(0, 10))
      )
    );
    if (abertos.length >= limiteAbertos) {
      return res.status(400).json({ error: `Cliente atingiu o limite de ${limiteAbertos} agendamentos em aberto` });
    }

    const limiteDiario = parseInt(params["agenda_limite_diario_mesmo_servico"] || "1");
    const mesmoServicoDia = abertos.filter(a => a.data === data && a.servicoId === servicoId);
    if (mesmoServicoDia.length >= limiteDiario) {
      return res.status(400).json({ error: `Limite de ${limiteDiario} agendamento(s) por dia para o mesmo serviço atingido` });
    }

    if (params["agenda_mesmo_horario_cliente"] !== "Sim") {
      const mesmoHorario = abertos.filter(a => a.data === data && a.horaInicio === horaInicio);
      if (mesmoHorario.length > 0) {
        return res.status(409).json({ error: "Cliente já possui agendamento neste horário" });
      }
    }
  }

  const limiteAntecedencia = parseInt(params["agenda_limite_antecedencia"] || "2");
  const agendDataObj = new Date(data + "T" + horaInicio + ":00");
  const agoraDate = new Date();
  const diffMs = agendDataObj.getTime() - agoraDate.getTime();
  const diffHoras = diffMs / (1000 * 60 * 60);
  if (diffHoras < limiteAntecedencia && diffHoras >= 0) {
    return res.status(400).json({ error: `Agendamento requer no mínimo ${limiteAntecedencia} hora(s) de antecedência` });
  }

  const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, servicoId), eq(servicosTable.barbeariaId, barbeariaId))).limit(1);
  if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });
  const [profissional] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, profissionalId), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!profissional) return res.status(404).json({ error: "Profissional não encontrado" });

  const [profServicoOverride] = await db.select().from(profissionalServicosTable).where(
    and(
      eq(profissionalServicosTable.profissionalId, profissionalId),
      eq(profissionalServicosTable.servicoId, servicoId),
      eq(profissionalServicosTable.barbeariaId, barbeariaId)
    )
  ).limit(1);

  const tempoPadraoStr = params["agenda_tempo_padrao"] || "30min";
  const tempoPadrao = tempoPadraoStr === "1h" ? 60 : (parseInt(tempoPadraoStr) || 30);
  const duracaoFinal = profServicoOverride?.tempoOverride ?? servico.duracaoMinutos ?? tempoPadrao;
  const horaFim = addMinutesToTime(horaInicio, duracaoFinal);
  const valorEfetivo = profServicoOverride?.precoOverride != null ? profServicoOverride.precoOverride : servico.preco;
  if (!encaixe) {
    const bloqueios = await db.select().from(bloqueiosHorarioTable).where(
      and(
        eq(bloqueiosHorarioTable.barbeariaId, barbeariaId),
        eq(bloqueiosHorarioTable.profissionalId, profissionalId),
        eq(bloqueiosHorarioTable.data, data),
      )
    );
    const overlaps = bloqueios.some(b => horaInicio < b.horaFim && horaFim > b.horaInicio);
    if (overlaps) {
      return res.status(409).json({ error: "Este horário está bloqueado para o profissional selecionado" });
    }
  }
  let isAniversario = false;
  if (clienteId) {
    const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, clienteId)).limit(1);
    if (cliente?.aniversario) {
      const today = data;
      const aniv = cliente.aniversario.slice(5);
      isAniversario = today.slice(5) === aniv;
    }
  }
  const paramHoraInicio = params["agenda_horario_inicio"];
  const paramHoraFim = params["agenda_horario_fim"];
  if (paramHoraInicio && timeToMinutes(horaInicio) < timeToMinutes(paramHoraInicio)) {
    return res.status(400).json({ error: `Horário antes do início permitido (${paramHoraInicio})` });
  }
  if (paramHoraFim && timeToMinutes(horaFim) > timeToMinutes(paramHoraFim)) {
    return res.status(400).json({ error: `Horário após o fim permitido (${paramHoraFim})` });
  }

  let pacoteClienteAssociado: number | null = null;
  if (clienteId && params["agenda_associar_pacote_auto"] !== "Desabilitado") {
    const pacotesCliente = await db.select().from(pacotesClienteTable).where(
      and(
        eq(pacotesClienteTable.barbeariaId, barbeariaId),
        eq(pacotesClienteTable.clienteId, clienteId),
        eq(pacotesClienteTable.status, "ativo")
      )
    );
    for (const pc of pacotesCliente) {
      if (pc.sessoesUsadas >= pc.sessoesTotal) continue;
      if (pc.dataValidade && new Date(pc.dataValidade) < new Date()) continue;
      const [pacote] = await db.select().from(pacotesTable).where(eq(pacotesTable.id, pc.pacoteId)).limit(1);
      if (!pacote) continue;
      const itens = pacote.itens;
      if (Array.isArray(itens) && itens.some((it: unknown) => {
        const item = it as Record<string, unknown>;
        return item.servicoId === servicoId || item.id === servicoId;
      })) {
        pacoteClienteAssociado = pc.id;
        break;
      }
    }
  }

  const [agend] = await db.insert(agendamentosTable).values({
    barbeariaId,
    clienteId: clienteId || null,
    clienteNome,
    clienteTelefone,
    profissionalId,
    profissionalNome: profissional.apelido || profissional.nomeExibicao,
    servicoId,
    servicoNome: servico.nome,
    data,
    horaInicio,
    horaFim,
    status: "confirmado",
    valor: valorEfetivo,
    pago: false,
    semPreferencia: semPreferencia ?? false,
    observacao: observacao || null,
    aniversario: isAniversario,
    vip: false,
    encaixe: encaixe ?? false,
    pacoteClienteId: pacoteClienteAssociado,
    origem: origem || "manual",
  }).returning();

  notificarAgendamento(barbeariaId, params, {
    clienteNome, clienteTelefone, clienteId,
    profissionalNome: profissional.apelido || profissional.nomeExibicao,
    servicoNome: servico.nome, data, horaInicio,
    agendamentoId: agend.id,
  }, "criado");

  return res.status(201).json({ ...formatAgend(agend), pacoteClienteId: pacoteClienteAssociado });
});

router.get("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);
  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });
  if (user.role === "colaborador") {
    if (!user.profissionalId || agend.profissionalId !== user.profissionalId) {
      return res.status(403).json({ error: "Acesso negado" });
    }
  }
  return res.json(formatAgend(agend));
});

router.put("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);
  const { status, profissionalId, data, horaInicio, observacao, pago } = req.body;
  const [existing] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Agendamento não encontrado" });
  if (user.role === "colaborador") {
    if (!user.profissionalId || existing.profissionalId !== user.profissionalId) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const params = await getParametros(barbeariaId);
    if (params["cancel_bloquear_edicao_profissional"] === "Sim") {
      return res.status(403).json({ error: "Edição de agendamento bloqueada para profissionais não-gestores" });
    }
  }
  const updates: any = {
    status: status ?? existing.status,
    observacao: observacao ?? existing.observacao,
    pago: pago !== undefined ? pago : existing.pago,
    updatedAt: new Date(),
  };
  if (profissionalId && profissionalId !== existing.profissionalId) {
    if (user.role === "colaborador") {
      const paramsEdit = await getParametros(barbeariaId);
      if (paramsEdit["agenda_alterar_profissional_nao_gestor"] !== "Sim") {
        return res.status(403).json({ error: "Alteração de profissional bloqueada para não-gestores" });
      }
    }
    const [prof] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, profissionalId), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
    if (prof) { updates.profissionalId = profissionalId; updates.profissionalNome = prof.apelido || prof.nomeExibicao; }
  }
  if (data) updates.data = data;
  if (horaInicio) updates.horaInicio = horaInicio;
  const [updated] = await db.update(agendamentosTable).set(updates).where(eq(agendamentosTable.id, id)).returning();
  return res.json(formatAgend(updated));
});

router.delete("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);
  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador") {
    if (!user.profissionalId) return res.status(403).json({ error: "Acesso negado" });
    if (agend.profissionalId !== user.profissionalId) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    if (params["cancel_bloquear_profissional"] === "Sim") {
      return res.status(403).json({ error: "Cancelamento bloqueado para profissionais não-gestores" });
    }
  }

  if (user.role !== "dono" && user.role !== "gerente") {
    const toleranciaHoras = parseInt(params["cancel_tolerancia_cliente"] || "2");
    if (agend.data && agend.horaInicio) {
      const agendDate = new Date(agend.data + "T" + agend.horaInicio + ":00");
      const agora = new Date();
      const diffMs = agendDate.getTime() - agora.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      if (diffHoras >= 0 && diffHoras < toleranciaHoras) {
        return res.status(400).json({ error: `Cancelamento não permitido com menos de ${toleranciaHoras} hora(s) de antecedência` });
      }
    }
  }

  await db.update(agendamentosTable).set({ status: "cancelado", updatedAt: new Date() }).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId)));

  notificarAgendamento(barbeariaId, params, {
    clienteNome: agend.clienteNome,
    clienteTelefone: agend.clienteTelefone || undefined,
    clienteId: agend.clienteId,
    profissionalNome: agend.profissionalNome,
    servicoNome: agend.servicoNome,
    data: agend.data,
    horaInicio: agend.horaInicio,
    agendamentoId: agend.id,
  }, "cancelado");

  return res.json({ success: true, message: "Agendamento cancelado" });
});

router.post("/:agendamentoId/checkout", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);

  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador") {
    if (params["comanda_fechamento_nao_gestor"] !== "Sim") {
      return res.status(403).json({ error: "Fechamento de comanda não permitido para seu perfil" });
    }
  }

  if (params["comanda_abertura_nao_gestor"] === "Sim" && user.role === "colaborador") {
    return res.status(403).json({ error: "Abertura de comanda bloqueada para profissionais não gestores" });
  }

  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });
  const [profissional] = await db.select().from(profissionaisTable).where(eq(profissionaisTable.id, agend.profissionalId)).limit(1);
  const { produtosAdicionais = [], pagamentos, observacao, desconto: rawDesconto = 0, descontoTipo = "valor", parcelas: rawParcelas = 1, gorjeta, tipoComanda: rawTipoComanda } = req.body;
  const tipoComanda = rawTipoComanda === "profissional" ? "profissional" : "cliente";

  if (params["comanda_obrigatoriedade_bandeira"] === "Sim") {
    if (Array.isArray(pagamentos) && pagamentos.length > 0) {
      const semBandeira = pagamentos.some((p: any) => (p.metodo === "credito" || p.metodo === "debito") && !p.bandeira);
      if (semBandeira) {
        return res.status(400).json({ error: "Seleção de bandeira é obrigatória para pagamentos em cartão" });
      }
    }
  }

  if (gorjeta && Number(gorjeta.valor) > 0 && params["comanda_habilitar_caixinha"] !== "Sim") {
    return res.status(400).json({ error: "Caixinha/gorjeta não está habilitada" });
  }

  const desconto = Math.max(0, Number(rawDesconto) || 0);
  const parcelas = Math.max(1, Math.floor(Number(rawParcelas) || 1));
  const valorServico = parseFloat(agend.valor as string);

  const [profServicoLink] = profissional ? await db.select().from(profissionalServicosTable).where(
    and(
      eq(profissionalServicosTable.profissionalId, agend.profissionalId),
      eq(profissionalServicosTable.servicoId, agend.servicoId),
      eq(profissionalServicosTable.barbeariaId, barbeariaId)
    )
  ).limit(1) : [undefined];

  const hasComissaoOverride = profServicoLink?.comissaoOverride != null;
  const comissaoPerc = hasComissaoOverride
    ? parseFloat(profServicoLink!.comissaoOverride!)
    : (profissional ? parseFloat(profissional.comissaoValor as string) : 40);
  let comissaoServico = (hasComissaoOverride || profissional?.comissaoTipo === "percentual")
    ? (valorServico * comissaoPerc) / 100
    : comissaoPerc;

  const comissaoEditavel = params["comanda_edicao_comissoes"] || "Liberar";
  if (comissaoEditavel === "Bloquear" && req.body.comissaoCustom !== undefined) {
    comissaoServico = (hasComissaoOverride || profissional?.comissaoTipo === "percentual")
      ? (valorServico * comissaoPerc) / 100
      : comissaoPerc;
  } else if (comissaoEditavel === "Liberar" && req.body.comissaoCustom !== undefined) {
    comissaoServico = Math.max(0, Number(req.body.comissaoCustom) || comissaoServico);
  }

  if (params["comissao_valor_original_assinatura"] === "Sim" && req.body.assinaturaClube && agend.clienteId) {
    const [assinante] = await db.select().from(assinantesTable).where(
      and(
        eq(assinantesTable.barbeariaId, barbeariaId),
        eq(assinantesTable.clienteId, agend.clienteId),
        eq(assinantesTable.status, "ativo")
      )
    ).limit(1);
    if (assinante) {
      const [servicoOriginal] = await db.select().from(servicosTable).where(
        and(eq(servicosTable.id, agend.servicoId), eq(servicosTable.barbeariaId, barbeariaId))
      ).limit(1);
      if (servicoOriginal) {
        const valorOriginal = parseFloat(servicoOriginal.preco as string);
        comissaoServico = (hasComissaoOverride || profissional?.comissaoTipo === "percentual")
          ? (valorOriginal * comissaoPerc) / 100
          : comissaoPerc;
      }
    }
  }

  if (req.body.cortesia && params["comissao_nao_gerar_cortesia"] === "Sim") {
    comissaoServico = 0;
  }

  if (agend.pacoteClienteId && params["comissao_nao_gerar_pacote"] === "Habilitado") {
    comissaoServico = 0;
  }

  let valorProdutos = 0;
  let comissaoProdutos = 0;
  const prodItems: any[] = [];
  for (const p of produtosAdicionais) {
    const [prod] = await db.select().from(produtosTable).where(and(eq(produtosTable.id, p.produtoId), eq(produtosTable.barbeariaId, barbeariaId))).limit(1);
    if (prod) {
      valorProdutos += p.valor * p.quantidade;
      const comProd = (p.valor * p.quantidade * 10) / 100;
      comissaoProdutos += comProd;
      prodItems.push({ id: prod.id, nome: prod.nome, valor: p.valor, quantidade: p.quantidade, comissao: comProd });
      await db.update(produtosTable).set({ quantidade: prod.quantidade - p.quantidade, updatedAt: new Date() }).where(eq(produtosTable.id, prod.id));
    }
  }
  let valorTotal = valorServico + valorProdutos;
  if (desconto > 0) {
    if (descontoTipo === "percentual") {
      const clampedPct = Math.min(desconto, 100);
      valorTotal = valorTotal * (1 - clampedPct / 100);
    } else {
      valorTotal = Math.max(0, valorTotal - desconto);
    }
  }
  valorTotal = Math.max(0, valorTotal);
  let gorjetaVal: { profissionalId: number; valor: number } | null = null;
  if (gorjeta && Number(gorjeta.valor) > 0) {
    const gorjetaProfId = gorjeta.profissionalId ?? agend.profissionalId;
    if (gorjetaProfId !== agend.profissionalId) {
      const [gp] = await db.select().from(profissionaisTable).where(
        and(eq(profissionaisTable.id, gorjetaProfId), eq(profissionaisTable.barbeariaId, barbeariaId))
      ).limit(1);
      if (!gp) return res.status(400).json({ error: "Profissional da gorjeta não pertence a esta barbearia" });
    }
    gorjetaVal = { profissionalId: gorjetaProfId, valor: Number(gorjeta.valor) };
    valorTotal += gorjetaVal.valor;
  }
  if (params["comissao_zerar_fidelidade"] === "Sim" && agend.clienteId && req.body.resgateId) {
    const [resgate] = await db.select().from(resgatesTable).where(
      and(
        eq(resgatesTable.id, req.body.resgateId),
        eq(resgatesTable.barbeariaId, barbeariaId),
        eq(resgatesTable.clienteId, agend.clienteId)
      )
    ).limit(1);
    if (resgate) {
      comissaoServico = 0;
    }
  }

  const comissaoTotal = comissaoServico + comissaoProdutos;
  const now = new Date();
  const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let taxaCartaoTotal = 0;
  let dataCompensacao: string | null = null;
  const pags = Array.isArray(pagamentos) ? pagamentos : [];
  for (const pag of pags) {
    if ((pag.metodo === "credito" || pag.metodo === "debito") && pag.bandeira) {
      const [bandeira] = await db.select().from(tiposTable).where(
        and(eq(tiposTable.barbeariaId, barbeariaId), eq(tiposTable.categoria, "bandeira"), eq(tiposTable.nome, pag.bandeira))
      ).limit(1);
      if (bandeira && bandeira.taxaOperadora) {
        const taxa = (Number(pag.valor) * parseFloat(bandeira.taxaOperadora)) / 100;
        taxaCartaoTotal += taxa;
      }
      if (bandeira && bandeira.diasRecebimento) {
        const comp = new Date(now);
        const dias = bandeira.diasRecebimento;
        if (bandeira.diasUteis) {
          let added = 0;
          while (added < dias) {
            comp.setDate(comp.getDate() + 1);
            const day = comp.getDay();
            if (day !== 0 && day !== 6) added++;
          }
        } else {
          comp.setDate(comp.getDate() + dias);
        }
        const compStr = comp.toISOString().slice(0, 10);
        if (!dataCompensacao || compStr > dataCompensacao) {
          dataCompensacao = compStr;
        }
      }
    }
  }
  const valorLiquido = valorTotal - taxaCartaoTotal;

  const comanda = await db.transaction(async (tx) => {
    const [cmd] = await tx.insert(comandasTable).values({
      barbeariaId,
      agendamentoId: id,
      clienteNome: agend.clienteNome,
      profissionalId: agend.profissionalId,
      profissionalNome: agend.profissionalNome,
      mesAno,
      servicos: [{ id: agend.servicoId, nome: agend.servicoNome, valor: valorServico, comissao: comissaoServico }],
      produtos: prodItems,
      pagamentos: pags,
      gorjeta: gorjetaVal,
      tipoComanda,
      valorTotal: String(valorTotal),
      valorLiquido: String(valorLiquido),
      taxaCartao: taxaCartaoTotal > 0 ? String(taxaCartaoTotal) : null,
      dataCompensacao,
      comissaoTotal: String(comissaoTotal),
      desconto: String(desconto),
      descontoTipo,
      parcelas,
      status: "paga",
      observacao: observacao || null,
      cadastradoPor: profissional?.nomeExibicao || agend.profissionalNome,
      clienteId: agend.clienteId || null,
      pontosGanhos: 0,
    }).returning();
    await tx.update(agendamentosTable).set({ status: "pago", pago: true, updatedAt: new Date() }).where(eq(agendamentosTable.id, id));
    if (agend.clienteId) {
      const [cli] = await tx.select().from(clientesTable).where(eq(clientesTable.id, agend.clienteId)).limit(1);
      if (cli) {
        let pontos = 0;
        const fidelidadeAtiva = params["fidelidade_desativar"] !== "Sim";
        if (fidelidadeAtiva) {
          const apenasAppSite = params["fidelidade_pontos_app_site"] === "Sim";
          const origemAgend = agend.origem;
          const isAppSite = origemAgend === "app" || origemAgend === "site";
          if (!apenasAppSite || isAppSite) {
            pontos = await calcPontosFromPagamentos(barbeariaId, pags, valorTotal);
          }
        }
        if (pontos > 0) {
          await tx.update(comandasTable).set({ pontosGanhos: pontos }).where(eq(comandasTable.id, cmd.id));
        }
        await tx.update(clientesTable).set({
          totalGasto: String(parseFloat(cli.totalGasto as string) + valorTotal),
          pontosFidelidade: cli.pontosFidelidade + pontos,
          ultimaVisita: now.toISOString().slice(0, 10),
          updatedAt: new Date(),
        }).where(eq(clientesTable.id, agend.clienteId));
      }
    }
    if (tipoComanda === "profissional" && profissional) {
      await tx.insert(contasProfissionalTable).values({
        barbeariaId,
        profissionalId: agend.profissionalId,
        profissionalNome: profissional.apelido || profissional.nomeExibicao,
        tipo: "debito",
        descricao: `Comanda profissional #${cmd.id} — ${agend.servicoNome}`,
        valor: String(valorTotal),
        mesAno,
        data: now.toISOString().slice(0, 10),
        status: "pendente",
      });
    }
    return cmd;
  });

  try {
    const pesquisasAtivas = await db.select().from(pesquisaSatisfacaoTable).where(
      and(
        eq(pesquisaSatisfacaoTable.barbeariaId, barbeariaId),
        eq(pesquisaSatisfacaoTable.ativo, true),
        eq(pesquisaSatisfacaoTable.envioAutomatico, true)
      )
    );
    if (pesquisasAtivas.length > 0 && agend.clienteId) {
      const pesquisa = pesquisasAtivas[0];
      const [cliente] = await db.select().from(clientesTable)
        .where(eq(clientesTable.id, agend.clienteId)).limit(1);
      const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0] || "";
      const surveyUrl = `https://${domain}/pesquisa/${pesquisa.id}?cliente=${agend.clienteId}&prof=${agend.profissionalId}`;
      const [barb] = await db.select().from(barbeariasTable)
        .where(eq(barbeariasTable.id, barbeariaId)).limit(1);
      const nomeEstab = barb?.nome || "Glow Up";

      const enviarAvaliacaoWhatsapp = params["notif_avaliacao_whatsapp"] === "Sim";
      if (enviarAvaliacaoWhatsapp && agend.clienteTelefone) {
        console.log(`[Pesquisa] WhatsApp avaliação preparado para ${agend.clienteTelefone} — link: ${surveyUrl}`);
      }

      if (cliente?.email) {
        await sendEmail({
          to: [{ email: cliente.email, name: agend.clienteNome }],
          subject: `${nomeEstab} — Avalie seu atendimento`,
          htmlContent: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#fafafa;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;">
    <div style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(196,164,106,0.08),rgba(196,164,106,0.02));">
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;">${nomeEstab}</h1>
      <p style="margin:0;font-size:13px;color:rgba(0,0,0,0.4);">Pesquisa de Satisfação</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px;">Olá, ${agend.clienteNome}!</p>
      <p style="font-size:14px;color:rgba(0,0,0,0.6);line-height:1.6;margin:0 0 24px;">
        Gostaríamos de saber como foi sua experiência com <strong>${agend.profissionalNome}</strong>.
        Sua opinião é muito importante para nós!
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${surveyUrl}" style="display:inline-block;padding:12px 32px;background:#c4a46a;color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
          Avaliar Atendimento
        </a>
      </div>
      <p style="font-size:12px;color:rgba(0,0,0,0.3);text-align:center;margin:24px 0 0;">
        Obrigado por ser nosso(a) cliente!
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.25);">${nomeEstab} — Glow Up</p>
    </div>
  </div>
</body></html>`,
        });
        console.log(`[Pesquisa] Email enviado para ${cliente.email} — pesquisa #${pesquisa.id}`);
      }
    }
  } catch (pesquisaErr) {
    console.error("Erro ao enviar pesquisa de satisfação automática:", pesquisaErr);
  }

  return res.status(201).json({
    ...comanda,
    valorTotal: parseFloat(comanda.valorTotal as string),
    valorLiquido: comanda.valorLiquido != null ? parseFloat(comanda.valorLiquido as string) : null,
    taxaCartao: comanda.taxaCartao != null ? parseFloat(comanda.taxaCartao as string) : null,
    comissaoTotal: parseFloat(comanda.comissaoTotal as string),
    dataFechamento: comanda.dataFechamento?.toISOString(),
    createdAt: comanda.createdAt?.toISOString(),
  });
});

export default router;
