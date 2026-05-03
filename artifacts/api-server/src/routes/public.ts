import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable, servicosTable, profissionaisTable, agendamentosTable, clientesTable, avaliacoesTable, recompensasTable, produtosTable, profissionalServicosTable, pesquisaSatisfacaoTable, respostasPesquisaTable, categoriasServicoTable, filiaisTable } from "@workspace/db/schema";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { sendPushToBarbearia } from "../lib/pushNotifications.js";
import { requireClient } from "../lib/auth.js";
import { validateAgendamentoEmHorario, validateAgendamentoEmJornadaProf } from "../lib/horarioValidation.js";

const router: IRouter = Router();

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DIAS_FUNC_INDEX = [6, 0, 1, 2, 3, 4, 5];

function getBarbeariaScheduleForDate(barbearia: any, dateStr: string): { aberto: boolean; inicio: number; fim: number; intervaloInicio?: number; intervaloFim?: number } | null {
  const hf = barbearia.horarioFuncionamento;
  if (!hf || !Array.isArray(hf) || hf.length === 0) return null;
  const date = new Date(dateStr + "T12:00:00");
  const jsDay = date.getDay();
  const idx = DIAS_FUNC_INDEX[jsDay];
  const dia = hf[idx];
  if (!dia) return null;
  if (!dia.ativo) return { aberto: false, inicio: 0, fim: 0 };
  const result: any = {
    aberto: true,
    inicio: timeToMinutes(dia.abertura || "08:00"),
    fim: timeToMinutes(dia.fechamento || "20:00"),
  };
  if (dia.intervaloInicio && dia.intervaloFim) {
    result.intervaloInicio = timeToMinutes(dia.intervaloInicio);
    result.intervaloFim = timeToMinutes(dia.intervaloFim);
  }
  return result;
}

function getProfScheduleForDate(prof: any, dateStr: string, barbSchedule?: { inicio: number; fim: number } | null): { inicio: number; fim: number } | null {
  const date = new Date(dateStr + "T12:00:00");
  const diaSemana = DIAS_SEMANA[date.getDay()];
  const horarios = prof.horarios as any;
  if (!horarios) {
    if (barbSchedule) return { inicio: barbSchedule.inicio, fim: barbSchedule.fim };
    return { inicio: 8 * 60, fim: 20 * 60 };
  }
  if (horarios.porDia && horarios.porDia[diaSemana]) {
    const dia = horarios.porDia[diaSemana];
    if (dia.folga) return null;
    return { inicio: timeToMinutes(dia.inicio || "08:00"), fim: timeToMinutes(dia.fim || "20:00") };
  }
  if (horarios.inicio && horarios.fim) {
    return { inicio: timeToMinutes(horarios.inicio), fim: timeToMinutes(horarios.fim) };
  }
  if (barbSchedule) return { inicio: barbSchedule.inicio, fim: barbSchedule.fim };
  return { inicio: 8 * 60, fim: 20 * 60 };
}

router.get("/pesquisa/:barbeariaId/:pesquisaId", async (req, res) => {
  try {
    const barbeariaId = parseInt(req.params.barbeariaId);
    const pesquisaId = parseInt(req.params.pesquisaId);
    if (isNaN(barbeariaId) || isNaN(pesquisaId)) return res.status(400).json({ error: "Parâmetros inválidos" });
    const [pesquisa] = await db.select().from(pesquisaSatisfacaoTable).where(and(eq(pesquisaSatisfacaoTable.id, pesquisaId), eq(pesquisaSatisfacaoTable.barbeariaId, barbeariaId), eq(pesquisaSatisfacaoTable.ativo, true))).limit(1);
    if (!pesquisa) return res.status(404).json({ error: "Pesquisa não encontrada ou inativa" });
    const [barbearia] = await db.select({ nome: barbeariasTable.nome }).from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
    res.json({ id: pesquisa.id, titulo: pesquisa.titulo, perguntas: pesquisa.perguntas, barbeariaNome: barbearia?.nome || "" });
  } catch (e) {
    console.error("public pesquisa get error:", e);
    res.status(500).json({ error: "Erro ao carregar pesquisa" });
  }
});

router.post("/pesquisa/:barbeariaId/:pesquisaId/responder", async (req, res) => {
  try {
    const barbeariaId = parseInt(req.params.barbeariaId);
    const pesquisaId = parseInt(req.params.pesquisaId);
    if (isNaN(barbeariaId) || isNaN(pesquisaId)) return res.status(400).json({ error: "Parâmetros inválidos" });
    const [pesquisa] = await db.select().from(pesquisaSatisfacaoTable).where(and(eq(pesquisaSatisfacaoTable.id, pesquisaId), eq(pesquisaSatisfacaoTable.barbeariaId, barbeariaId), eq(pesquisaSatisfacaoTable.ativo, true))).limit(1);
    if (!pesquisa) return res.status(404).json({ error: "Pesquisa não encontrada ou inativa" });
    const { clienteNome, respostas, nota } = req.body;
    const [row] = await db.insert(respostasPesquisaTable).values({ barbeariaId, pesquisaId, clienteNome: clienteNome || "Anônimo", respostas: respostas || {}, nota }).returning();
    res.status(201).json({ success: true, id: row.id });
  } catch (e) {
    console.error("public pesquisa responder error:", e);
    res.status(500).json({ error: "Erro ao enviar resposta" });
  }
});

router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

  const { getParametros: getPublicParams } = await import("../lib/parametros.js");
  const pubParams = await getPublicParams(barbearia.id);

  const filiais = await db.select().from(filiaisTable).where(
    and(eq(filiaisTable.barbeariaId, barbearia.id), eq(filiaisTable.ativo, true))
  );

  const [servicos, profissionais, avaliacoes, recompensas, produtos, profServicos] = await Promise.all([
    db.select().from(servicosTable).where(and(eq(servicosTable.barbeariaId, barbearia.id), eq(servicosTable.ativo, true))),
    db.select().from(profissionaisTable).where(and(eq(profissionaisTable.barbeariaId, barbearia.id), eq(profissionaisTable.ativo, true))),
    db.select().from(avaliacoesTable).where(eq(avaliacoesTable.barbeariaId, barbearia.id)).orderBy(desc(avaliacoesTable.createdAt)).limit(20),
    db.select().from(recompensasTable).where(and(eq(recompensasTable.barbeariaId, barbearia.id), eq(recompensasTable.ativo, true))),
    db.select().from(produtosTable).where(and(eq(produtosTable.barbeariaId, barbearia.id), eq(produtosTable.ativo, true))),
    db.select().from(profissionalServicosTable).where(eq(profissionalServicosTable.barbeariaId, barbearia.id)),
  ]);

  const linksByProf: Record<number, number[]> = {};
  for (const l of profServicos) {
    if (!linksByProf[l.profissionalId]) linksByProf[l.profissionalId] = [];
    linksByProf[l.profissionalId].push(l.servicoId);
  }

  const notaMedia = avaliacoes.length > 0 ? avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length : 0;

  const showSemPreferencia = pubParams["agenda_sem_preferencia"] !== "Não";
  const showCategorias = pubParams["agenda_categorias_selecao"] === "Sim";

  let categorias: { id: number; nome: string; ordem: number }[] = [];
  if (showCategorias) {
    const cats = await db.select().from(categoriasServicoTable).where(
      and(eq(categoriasServicoTable.barbeariaId, barbearia.id), eq(categoriasServicoTable.ativo, true))
    );
    categorias = cats.map(c => ({ id: c.id, nome: c.nome, ordem: c.ordem })).sort((a, b) => a.ordem - b.ordem);
  }

  const mostrarProdutos = pubParams["outros_mostrar_produtos_app"] !== "Não";
  const esconderNaoQueroConversar = pubParams["app_nao_quero_conversar"] === "Sim";
  const tipoLinkAgendamento = pubParams["agenda_tipo_link"] === "Sem login (simples)" ? "simples" : "com_login";

  const permitirCancelamentoCliente = (pubParams["cancel_permitir_cliente_link_publico"] ?? "Sim") !== "Não";
  const toleranciaCancelamento = parseInt(pubParams["cancel_tolerancia_cliente"] || "2");
  const whatsappEncaixeHabilitado = pubParams["agenda_whatsapp_encaixe"] === "Sim";

  return res.json({
    id: barbearia.id,
    nome: barbearia.nome,
    slug: barbearia.slug,
    telefone: barbearia.telefone,
    email: barbearia.email,
    cidade: barbearia.cidade,
    uf: barbearia.uf,
    logradouro: barbearia.logradouro,
    numero: barbearia.numero,
    bairro: barbearia.bairro,
    cep: barbearia.cep,
    corPrimaria: barbearia.corPrimaria,
    logoUrl: barbearia.logoUrl,
    descricaoPublica: barbearia.descricaoPublica,
    horarioFuncionamento: barbearia.horarioFuncionamento,
    fotos: barbearia.fotos || [],
    formasPagamento: barbearia.formasPagamento || [],
    redesSociais: barbearia.redesSociais || {},
    semPreferenciaHabilitado: showSemPreferencia,
    naoQueroConversarOculto: esconderNaoQueroConversar,
    tipoLinkAgendamento,
    permitirCancelamentoCliente,
    toleranciaCancelamento,
    whatsappEncaixeHabilitado,
    categorias,
    filiais: filiais.map(f => ({
      id: f.id,
      nome: f.nome,
      logradouro: f.logradouro,
      numero: f.numero,
      bairro: f.bairro,
      cidade: f.cidade,
      uf: f.uf,
      telefone: f.telefone,
    })),
    servicos: servicos.map(s => ({
      ...s,
      preco: parseFloat(s.preco as string),
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    })),
    profissionais: [
      ...(showSemPreferencia ? [{
        id: 0,
        barbeariaId: barbearia.id,
        filialId: null,
        nomeExibicao: "Sem preferência",
        apelido: "Sem preferência",
        imagemUrl: null,
        ativo: true,
        comissaoValor: 0,
        createdAt: null,
        updatedAt: null,
        servicoIds: servicos.map(s => s.id),
        semPreferencia: true,
      }] : []),
      ...profissionais.map(p => ({
        ...p,
        comissaoValor: parseFloat(p.comissaoValor as string),
        createdAt: p.createdAt?.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
        servicoIds: linksByProf[p.id] || [],
        semPreferencia: false,
      })),
    ],
    avaliacoes: avaliacoes.map(a => ({
      id: a.id,
      clienteNome: a.clienteNome,
      profissionalNome: a.profissionalNome,
      nota: a.nota,
      comentario: a.comentario,
      createdAt: a.createdAt?.toISOString(),
    })),
    notaMedia: Math.round(notaMedia * 10) / 10,
    totalAvaliacoes: avaliacoes.length,
    recompensas: recompensas.map(r => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao,
      pontosNecessarios: r.pontosNecessarios,
      tipo: r.tipo,
    })),
    ...(mostrarProdutos ? {
      produtos: produtos.map(p => ({
        id: p.id,
        nome: p.nome,
        preco: parseFloat(p.preco as string),
      })),
    } : { produtos: [] }),
  });
});

router.get("/:slug/slots", async (req, res) => {
  try {
    const { slug } = req.params;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const { data, profissionalId, servicoId, filialId: filialIdParam } = req.query;
    if (!data || !servicoId) return res.status(400).json({ error: "data e servicoId são obrigatórios" });

    const sId = parseInt(servicoId as string);
    const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, sId), eq(servicosTable.barbeariaId, barbearia.id))).limit(1);
    if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });

    const selectedFilialId = filialIdParam ? parseInt(filialIdParam as string) : null;

    if (selectedFilialId) {
      const [filial] = await db.select().from(filiaisTable).where(
        and(eq(filiaisTable.id, selectedFilialId), eq(filiaisTable.barbeariaId, barbearia.id), eq(filiaisTable.ativo, true))
      ).limit(1);
      if (!filial) {
        return res.status(400).json({ error: "Filial inválida" });
      }
      if (servico.filialId !== null && servico.filialId !== selectedFilialId) {
        return res.status(400).json({ error: "Serviço não disponível na filial selecionada" });
      }
    }

    let profissionais;
    const pId = profissionalId ? parseInt(profissionalId as string) : 0;
    if (profissionalId && pId !== 0) {
      profissionais = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, pId), eq(profissionaisTable.barbeariaId, barbearia.id), eq(profissionaisTable.ativo, true)));
      if (selectedFilialId && profissionais.length > 0) {
        profissionais = profissionais.filter(p => p.filialId === selectedFilialId || p.filialId === null);
      }
      if (profissionais.length > 0) {
        const profLinks = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, pId), eq(profissionalServicosTable.barbeariaId, barbearia.id)));
        if (profLinks.length > 0 && !profLinks.some(l => l.servicoId === sId)) {
          return res.json([]);
        }
      }
    } else {
      profissionais = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.barbeariaId, barbearia.id), eq(profissionaisTable.ativo, true)));

      if (selectedFilialId) {
        profissionais = profissionais.filter(p => p.filialId === selectedFilialId || p.filialId === null);
      }

      const allLinks = await db.select().from(profissionalServicosTable).where(eq(profissionalServicosTable.barbeariaId, barbearia.id));
      const hasAnyLinks = allLinks.length > 0;
      if (hasAnyLinks) {
        const profIdsForService = new Set(allLinks.filter(l => l.servicoId === sId).map(l => l.profissionalId));
        profissionais = profissionais.filter(p => profIdsForService.has(p.id));
      }
    }

    const agendamentos = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.barbeariaId, barbearia.id), eq(agendamentosTable.data, data as string), inArray(agendamentosTable.status, ["confirmado", "pendente_aprovacao"]))
    );

    const { getParametros, getLocalNow } = await import("../lib/parametros.js");
    const params = await getParametros(barbearia.id);

    const slotSizeParam = params["agenda_tamanho_slots"] || "30min";
    const intervalo = slotSizeParam === "1h" ? 60 : (parseInt(slotSizeParam) || 30);
    const limiteAntecedenciaRaw = params["agenda_limite_antecedencia"];
    const limiteAntecedenciaParsed = limiteAntecedenciaRaw !== undefined ? parseFloat(limiteAntecedenciaRaw) : 0;
    const limiteAntecedencia = isNaN(limiteAntecedenciaParsed) ? 0 : limiteAntecedenciaParsed;
    const limiteFuturoDias = parseInt(params["agenda_limite_futuro_dias"] || "30");

    const slots: any[] = [];
    const duracao = servico.duracaoMinutos;

    const localNow = getLocalNow(params);
    const todayStr = localNow.todayStr;
    const isToday = data === todayStr;
    const currentMinutes = isToday ? localNow.currentMinutes : 0;
    const dataReq = new Date((data as string) + "T12:00:00");
    const hojeDate = new Date(todayStr + "T12:00:00");
    const diffDias = Math.ceil((dataReq.getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias > limiteFuturoDias) {
      return res.json([]);
    }

    const barbSchedule = getBarbeariaScheduleForDate(barbearia, data as string);
    if (barbSchedule && !barbSchedule.aberto) {
      return res.json([]);
    }

    const paramInicio = params["agenda_horario_inicio"];
    const paramFim = params["agenda_horario_fim"];
    const paramInicioMin = paramInicio ? timeToMinutes(paramInicio) : null;
    const paramFimMin = paramFim ? timeToMinutes(paramFim) : null;

    let effectiveGlobalInicio = barbSchedule ? barbSchedule.inicio : 8 * 60;
    let effectiveGlobalFim = barbSchedule ? barbSchedule.fim : 20 * 60;
    if (paramInicioMin != null) effectiveGlobalInicio = Math.max(effectiveGlobalInicio, paramInicioMin);
    if (paramFimMin != null) effectiveGlobalFim = Math.min(effectiveGlobalFim, paramFimMin);

    for (const prof of profissionais) {
      const schedule = getProfScheduleForDate(prof, data as string, barbSchedule);
      if (!schedule) continue;
      const inicioTrabalho = Math.max(schedule.inicio, effectiveGlobalInicio);
      const fimTrabalho = Math.min(schedule.fim, effectiveGlobalFim);
      for (let t = inicioTrabalho; t + duracao <= fimTrabalho; t += intervalo) {
        if (isToday && t <= currentMinutes + limiteAntecedencia * 60) continue;
        if (barbSchedule?.intervaloInicio != null && barbSchedule?.intervaloFim != null) {
          if (!(t + duracao <= barbSchedule.intervaloInicio || t >= barbSchedule.intervaloFim)) continue;
        }
        const horaInicio = minutesToTime(t);
        const horaFim = minutesToTime(t + duracao);
        const ocupado = agendamentos.some(a => {
          if (a.profissionalId !== prof.id) return false;
          const ai = timeToMinutes(a.horaInicio);
          const af = timeToMinutes(a.horaFim);
          return !(t + duracao <= ai || t >= af);
        });
        slots.push({ horaInicio, horaFim, profissionalId: prof.id, profissionalNome: prof.nomeExibicao, disponivel: !ocupado });
      }
    }
    return res.json(slots);
  } catch (e) {
    console.error("public slots error:", e);
    return res.status(500).json({ error: "Erro ao buscar horários" });
  }
});

router.post("/:slug/agendar", requireClient, async (req, res) => {
  try {
    const { slug } = req.params;
    const clienteUser = (req as any).clienteUser;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const { profissionalId, servicoId, data, horaInicio, semPreferencia, observacao, filialId, clienteWhatsapp: rawWhatsapp } = req.body;
    if (!profissionalId || !servicoId || !data || !horaInicio) {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    const whatsappDigits = rawWhatsapp ? String(rawWhatsapp).replace(/\D/g, "") : "";
    if (!whatsappDigits || whatsappDigits.length < 10 || whatsappDigits.length > 11) {
      return res.status(400).json({ error: "WhatsApp é obrigatório (10 ou 11 dígitos)" });
    }
    const clienteWhatsapp = whatsappDigits;

    if (filialId) {
      const [filial] = await db.select().from(filiaisTable).where(
        and(eq(filiaisTable.id, filialId), eq(filiaisTable.barbeariaId, barbearia.id), eq(filiaisTable.ativo, true))
      ).limit(1);
      if (!filial) {
        return res.status(400).json({ error: "Filial inválida" });
      }
    }

    const { getParametros: getParams2, getLocalNow: getLocalNow2 } = await import("../lib/parametros.js");
    const params = await getParams2(barbearia.id);
    const localNow = getLocalNow2(params);

    const gestorNotifHabilitada = (params["notif_mensagem_gestores"] || "Habilitado") === "Habilitado";
    const clienteNotifHabilitada = (params["notif_mensagem_agendar_cancelar"] || "Habilitado") === "Habilitado";

    const limiteFuturoDias = parseInt(params["agenda_limite_futuro_dias"] || "30");
    const dataAgend = new Date(data + "T12:00:00");
    const hojeDate = new Date(localNow.todayStr + "T12:00:00");
    const diffDias = Math.ceil((dataAgend.getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias > limiteFuturoDias) {
      return res.status(400).json({ error: `Agendamento limitado a ${limiteFuturoDias} dias no futuro` });
    }

    const limitePassadoDias = parseInt(params["agenda_limite_passado"] || "7");
    if (diffDias < 0 && Math.abs(diffDias) > limitePassadoDias) {
      return res.status(400).json({ error: `Agendamento não pode exceder ${limitePassadoDias} dias no passado` });
    }

    const limiteAntecedenciaRaw2 = params["agenda_limite_antecedencia"];
    const limiteAntecedenciaParsed2 = limiteAntecedenciaRaw2 !== undefined ? parseFloat(limiteAntecedenciaRaw2) : 0;
    const limiteAntecedencia = isNaN(limiteAntecedenciaParsed2) ? 0 : limiteAntecedenciaParsed2;
    const [hI, mI] = horaInicio.split(":").map(Number);
    const slotMinutes = hI * 60 + mI;
    const totalMinutesFromNow = (diffDias * 24 * 60) + (slotMinutes - localNow.currentMinutes);
    const diffHoras = totalMinutesFromNow / 60;
    if (diffHoras >= 0 && diffHoras < limiteAntecedencia) {
      return res.status(400).json({ error: `Agendamento requer no mínimo ${limiteAntecedencia} hora(s) de antecedência` });
    }

    const paramHoraInicio = params["agenda_horario_inicio"];
    const paramHoraFim = params["agenda_horario_fim"];

    const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, servicoId), eq(servicosTable.barbeariaId, barbearia.id))).limit(1);
    if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });
    const [profissional] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, profissionalId), eq(profissionaisTable.barbeariaId, barbearia.id))).limit(1);
    if (!profissional) return res.status(404).json({ error: "Profissional não encontrado" });

    if (filialId) {
      if (profissional.filialId !== null && profissional.filialId !== filialId) {
        return res.status(400).json({ error: "Profissional não pertence à filial selecionada" });
      }
      if (servico.filialId !== null && servico.filialId !== filialId) {
        return res.status(400).json({ error: "Serviço não disponível na filial selecionada" });
      }
    }

    const profLinks = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, profissionalId), eq(profissionalServicosTable.barbeariaId, barbearia.id)));
    if (profLinks.length > 0 && !profLinks.some(l => l.servicoId === servicoId)) {
      return res.status(400).json({ error: "Este profissional não atende o serviço selecionado" });
    }

    const tempoPadraoStr = params["agenda_tempo_padrao"] || "30min";
    const tempoPadrao = tempoPadraoStr === "1h" ? 60 : (parseInt(tempoPadraoStr) || 30);

    let [cliente] = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbearia.id), eq(clientesTable.email, clienteUser.email))
    ).limit(1);
    if (!cliente) {
      const autoAprovar = params["cliente_aprovar_cadastro_auto"] !== "Não";
      [cliente] = await db.insert(clientesTable).values({
        barbeariaId: barbearia.id,
        nome: clienteUser.nome,
        telefone: clienteUser.telefone || "",
        email: clienteUser.email,
        status: autoAprovar ? "aprovado" : "pendente",
      }).returning();
    }

    const duracaoFinal = servico.duracaoMinutos || tempoPadrao;
    const horaFim = addMinutes(horaInicio, duracaoFinal);

    if (paramHoraInicio && timeToMinutes(horaInicio) < timeToMinutes(paramHoraInicio)) {
      return res.status(400).json({ error: `Horário antes do início permitido (${paramHoraInicio})` });
    }
    if (paramHoraFim && timeToMinutes(horaFim) > timeToMinutes(paramHoraFim)) {
      return res.status(400).json({ error: `Horário após o fim permitido (${paramHoraFim})` });
    }

    const horarioErr = validateAgendamentoEmHorario(data, horaInicio, horaFim, (barbearia.horarioFuncionamento as any));
    if (horarioErr) return res.status(400).json({ error: horarioErr });
    if (profissional?.horarios) {
      const jornadaErr = validateAgendamentoEmJornadaProf(data, horaInicio, horaFim, profissional.horarios as any);
      if (jornadaErr) return res.status(400).json({ error: jornadaErr });
    }

    const existingAppts = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbearia.id),
        eq(agendamentosTable.profissionalId, profissionalId),
        eq(agendamentosTable.data, data),
        inArray(agendamentosTable.status, ["confirmado", "pendente_aprovacao"]),
      )
    );
    if (existingAppts.some(a => horaInicio < a.horaFim && horaFim > a.horaInicio)) {
      return res.status(409).json({ error: "Este horário já está ocupado para o profissional selecionado" });
    }

    const modoConfirmacao = (params || {})["agenda_modo_confirmacao"] || "Automatica";
    const isManualMode = modoConfirmacao === "Manual_dono" || modoConfirmacao === "Manual_profissional";
    const statusInicialPub = isManualMode ? "pendente_aprovacao" : "confirmado";

    const [agend] = await db.insert(agendamentosTable).values({
      barbeariaId: barbearia.id,
      filialId: filialId || null,
      clienteId: cliente.id,
      clienteNome: clienteUser.nome,
      clienteTelefone: clienteWhatsapp || clienteUser.telefone || "",
      profissionalId,
      profissionalNome: profissional.nomeExibicao,
      servicoId,
      servicoNome: servico.nome,
      data,
      horaInicio,
      horaFim,
      status: statusInicialPub,
      valor: servico.preco,
      pago: false,
      semPreferencia: semPreferencia ?? false,
      observacao: observacao || null,
      aniversario: false,
      vip: false,
      origem: "site",
    }).returning();

    if (statusInicialPub === "confirmado" && clienteNotifHabilitada && cliente.email) {
      const { sendEmail } = await import("../lib/brevo.js");
      const nomeEstab = barbearia.nome || "Glow Upi";
      sendEmail({
        to: [{ email: cliente.email, name: clienteUser.nome }],
        subject: `${nomeEstab} — Agendamento Confirmado`,
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>Olá <strong>${clienteUser.nome}</strong>, seu agendamento de <strong>${servico.nome}</strong> com <strong>${profissional.nomeExibicao}</strong> para o dia <strong>${data}</strong> às <strong>${horaInicio}</strong> foi confirmado com sucesso!</p></div>`,
      }).catch(err => console.error("[Notif] Error sending booking email to client:", err));
    }

    if (gestorNotifHabilitada) {
      const { sendEmail } = await import("../lib/brevo.js");
      const { usersTable } = await import("@workspace/db/schema");
      const nomeEstab = barbearia.nome || "Glow Upi";
      const gestores = await db.select().from(usersTable).where(
        and(eq(usersTable.barbeariaId, barbearia.id), eq(usersTable.role, "gerente"))
      );
      const donoUsers = await db.select().from(usersTable).where(eq(usersTable.role, "dono"));
      const allGestores = [...gestores];
      for (const d of donoUsers) {
        if (d.barbeariaId) continue;
        const [b] = await db.select({ id: barbeariasTable.id }).from(barbeariasTable).where(eq(barbeariasTable.donoId, d.id)).limit(1);
        if (b?.id === barbearia.id) allGestores.push(d);
      }
      for (const g of allGestores) {
        if (g.email) {
          sendEmail({
            to: [{ email: g.email, name: g.nome || "Gestor" }],
            subject: `${nomeEstab} — Novo agendamento pelo site: ${clienteUser.nome}`,
            htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>O cliente <strong>${clienteUser.nome}</strong> agendou <strong>${servico.nome}</strong> com <strong>${profissional.nomeExibicao}</strong> para o dia <strong>${data}</strong> às <strong>${horaInicio}</strong> pelo link público.</p></div>`,
          }).catch(err => console.error("[Notif] Error sending booking email to manager:", err));
        }
      }
    }

    sendPushToBarbearia(barbearia.id, {
      title: statusInicialPub === "pendente_aprovacao" ? "Aguardando confirmação" : "Novo Agendamento pelo Site",
      body: statusInicialPub === "pendente_aprovacao"
        ? `${clienteUser.nome} solicitou ${servico.nome} com ${profissional.nomeExibicao} em ${data} às ${horaInicio}. Confirme ou recuse.`
        : `${clienteUser.nome} agendou ${servico.nome} com ${profissional.nomeExibicao} em ${data} às ${horaInicio}`,
      data: { agendamentoId: agend.id, type: statusInicialPub === "pendente_aprovacao" ? "pending_appointment" : "new_appointment", url: "/agenda" },
    }).catch(err => console.error("[Push] Error on client booking:", err));

    let sinalPagamento: any = null;
    if (barbearia.prePagamentoAtivo) {
      try {
        const { getContaByBarbearia, createPaymentForBarbearia } = await import("../lib/asaasService.js");
        const conta = await getContaByBarbearia(barbearia.id);
        if (conta) {
          const valorServico = parseFloat(String(servico.preco || "0"));
          const sinalModo = barbearia.sinalModo || "percentual";
          const sinalValorBase = parseFloat(String(barbearia.sinalValor || "0"));
          const sinalValor = sinalModo === "valor"
            ? Math.max(0.5, sinalValorBase)
            : Math.max(0.5, Number(((valorServico * sinalValorBase) / 100).toFixed(2)));
          const due = new Date(); due.setDate(due.getDate() + 1);
          const result = await createPaymentForBarbearia({
            barbeariaId: barbearia.id,
            tipo: "agendamento",
            refType: "agendamento",
            refId: agend.id,
            billingType: "PIX",
            value: sinalValor,
            dueDate: due.toISOString().slice(0, 10),
            description: `Sinal — ${servico.nome} com ${profissional.nomeExibicao} (${data} ${horaInicio})`,
            payer: { nome: clienteUser.nome, telefone: clienteWhatsapp, email: clienteUser.email },
            externalReference: `agend-${agend.id}`,
          });
          await db.update(agendamentosTable).set({
            sinalStatus: "aguardando",
            sinalValorDevido: String(sinalValor),
            sinalAsaasPaymentId: result.pagamento.asaasPaymentId,
            sinalInformadoEm: new Date(),
            sinalExpiraEm: result.pixData?.expirationDate ? new Date(result.pixData.expirationDate) : null,
            updatedAt: new Date(),
          }).where(eq(agendamentosTable.id, agend.id));
          sinalPagamento = {
            asaasPaymentId: result.pagamento.asaasPaymentId,
            valor: sinalValor,
            pixQrCodeBase64: result.pixData?.encodedImage || null,
            pixCopyPaste: result.pixData?.payload || null,
            invoiceUrl: result.asaasPayment?.invoiceUrl || null,
            expiraEm: result.pixData?.expirationDate || null,
          };
        }
      } catch (sinalErr) {
        console.error("[public/agendar] erro gerando sinal Asaas:", sinalErr);
      }
    }

    return res.status(201).json({
      ...agend,
      valor: parseFloat(agend.valor as string),
      createdAt: agend.createdAt?.toISOString(),
      updatedAt: agend.updatedAt?.toISOString(),
      sinalPagamento,
    });
  } catch (e) {
    console.error("public agendar error:", e);
    return res.status(500).json({ error: "Erro ao criar agendamento" });
  }
});

router.post("/:slug/agendar-simples", async (req, res) => {
  try {
    const { slug } = req.params;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const { getParametros: getParamsSimples, getLocalNow: getLocalNowSimples } = await import("../lib/parametros.js");
    const paramsSimples = await getParamsSimples(barbearia.id);

    if (paramsSimples["agenda_tipo_link"] !== "Sem login (simples)") {
      return res.status(403).json({ error: "Agendamento simples não está habilitado para este estabelecimento" });
    }

    const { profissionalId, servicoId, data, horaInicio, semPreferencia, observacao, clienteNome, clienteWhatsapp, filialId } = req.body;
    if (!profissionalId || !servicoId || !data || !horaInicio) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    if (filialId) {
      const [filial] = await db.select().from(filiaisTable).where(
        and(eq(filiaisTable.id, filialId), eq(filiaisTable.barbeariaId, barbearia.id), eq(filiaisTable.ativo, true))
      ).limit(1);
      if (!filial) {
        return res.status(400).json({ error: "Filial inválida" });
      }
    }

    if (!clienteNome || !clienteWhatsapp) {
      return res.status(400).json({ error: "Nome e WhatsApp são obrigatórios" });
    }

    const whatsappLimpo = clienteWhatsapp.replace(/\D/g, "");
    if (whatsappLimpo.length < 10 || whatsappLimpo.length > 13) {
      return res.status(400).json({ error: "Número de WhatsApp inválido" });
    }

    const localNowSimples = getLocalNowSimples(paramsSimples);

    const gestorNotifHabilitada = (paramsSimples["notif_mensagem_gestores"] || "Habilitado") === "Habilitado";
    const clienteNotifHabilitada = (paramsSimples["notif_mensagem_agendar_cancelar"] || "Habilitado") === "Habilitado";

    const limiteFuturoDias = parseInt(paramsSimples["agenda_limite_futuro_dias"] || "30");
    const dataAgend = new Date(data + "T12:00:00");
    const hojeDate = new Date(localNowSimples.todayStr + "T12:00:00");
    const diffDias = Math.ceil((dataAgend.getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias > limiteFuturoDias) {
      return res.status(400).json({ error: `Agendamento limitado a ${limiteFuturoDias} dias no futuro` });
    }

    const limitePassadoDias = parseInt(paramsSimples["agenda_limite_passado"] || "7");
    if (diffDias < 0 && Math.abs(diffDias) > limitePassadoDias) {
      return res.status(400).json({ error: `Agendamento não pode exceder ${limitePassadoDias} dias no passado` });
    }

    const limiteAntecedenciaRaw = paramsSimples["agenda_limite_antecedencia"];
    const limiteAntecedenciaParsed = limiteAntecedenciaRaw !== undefined ? parseFloat(limiteAntecedenciaRaw) : 0;
    const limiteAntecedencia = isNaN(limiteAntecedenciaParsed) ? 0 : limiteAntecedenciaParsed;
    const [hI, mI] = horaInicio.split(":").map(Number);
    const slotMinutes = hI * 60 + mI;
    const totalMinutesFromNow = (diffDias * 24 * 60) + (slotMinutes - localNowSimples.currentMinutes);
    const diffHoras = totalMinutesFromNow / 60;
    if (diffHoras >= 0 && diffHoras < limiteAntecedencia) {
      return res.status(400).json({ error: `Agendamento requer no mínimo ${limiteAntecedencia} hora(s) de antecedência` });
    }

    const paramHoraInicio = paramsSimples["agenda_horario_inicio"];
    const paramHoraFim = paramsSimples["agenda_horario_fim"];

    const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, servicoId), eq(servicosTable.barbeariaId, barbearia.id))).limit(1);
    if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });
    const [profissional] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, profissionalId), eq(profissionaisTable.barbeariaId, barbearia.id))).limit(1);
    if (!profissional) return res.status(404).json({ error: "Profissional não encontrado" });

    if (filialId) {
      if (profissional.filialId !== null && profissional.filialId !== filialId) {
        return res.status(400).json({ error: "Profissional não pertence à filial selecionada" });
      }
      if (servico.filialId !== null && servico.filialId !== filialId) {
        return res.status(400).json({ error: "Serviço não disponível na filial selecionada" });
      }
    }

    const profLinks = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, profissionalId), eq(profissionalServicosTable.barbeariaId, barbearia.id)));
    if (profLinks.length > 0 && !profLinks.some(l => l.servicoId === servicoId)) {
      return res.status(400).json({ error: "Este profissional não atende o serviço selecionado" });
    }

    const tempoPadraoStr = paramsSimples["agenda_tempo_padrao"] || "30min";
    const tempoPadrao = tempoPadraoStr === "1h" ? 60 : (parseInt(tempoPadraoStr) || 30);

    let [cliente] = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbearia.id), eq(clientesTable.telefone, whatsappLimpo))
    ).limit(1);
    if (!cliente) {
      const autoAprovar = paramsSimples["cliente_aprovar_cadastro_auto"] !== "Não";
      [cliente] = await db.insert(clientesTable).values({
        barbeariaId: barbearia.id,
        nome: clienteNome,
        telefone: whatsappLimpo,
        email: null,
        status: autoAprovar ? "aprovado" : "pendente",
      }).returning();
    }

    const duracaoFinal = servico.duracaoMinutos || tempoPadrao;
    const horaFim = addMinutes(horaInicio, duracaoFinal);

    if (paramHoraInicio && timeToMinutes(horaInicio) < timeToMinutes(paramHoraInicio)) {
      return res.status(400).json({ error: `Horário antes do início permitido (${paramHoraInicio})` });
    }
    if (paramHoraFim && timeToMinutes(horaFim) > timeToMinutes(paramHoraFim)) {
      return res.status(400).json({ error: `Horário após o fim permitido (${paramHoraFim})` });
    }

    const horarioErrSimples = validateAgendamentoEmHorario(data, horaInicio, horaFim, (barbearia.horarioFuncionamento as any));
    if (horarioErrSimples) return res.status(400).json({ error: horarioErrSimples });
    if (profissional?.horarios) {
      const jornadaErrSimples = validateAgendamentoEmJornadaProf(data, horaInicio, horaFim, profissional.horarios as any);
      if (jornadaErrSimples) return res.status(400).json({ error: jornadaErrSimples });
    }

    const existingApptsSimples = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbearia.id),
        eq(agendamentosTable.profissionalId, profissionalId),
        eq(agendamentosTable.data, data),
        inArray(agendamentosTable.status, ["confirmado", "pendente_aprovacao"]),
      )
    );
    if (existingApptsSimples.some(a => horaInicio < a.horaFim && horaFim > a.horaInicio)) {
      return res.status(409).json({ error: "Este horário já está ocupado para o profissional selecionado" });
    }

    const modoConfirmacaoSimples = (paramsSimples || {})["agenda_modo_confirmacao"] || "Automatica";
    const isManualModeSimples = modoConfirmacaoSimples === "Manual_dono" || modoConfirmacaoSimples === "Manual_profissional";
    const statusInicialSimples = isManualModeSimples ? "pendente_aprovacao" : "confirmado";

    const [agend] = await db.insert(agendamentosTable).values({
      barbeariaId: barbearia.id,
      filialId: filialId || null,
      clienteId: cliente.id,
      clienteNome,
      clienteTelefone: whatsappLimpo,
      profissionalId,
      profissionalNome: profissional.nomeExibicao,
      servicoId,
      servicoNome: servico.nome,
      data,
      horaInicio,
      horaFim,
      status: statusInicialSimples,
      valor: servico.preco,
      pago: false,
      semPreferencia: semPreferencia ?? false,
      observacao: observacao || null,
      aniversario: false,
      vip: false,
      origem: "site",
    }).returning();

    if (statusInicialSimples === "confirmado" && clienteNotifHabilitada && cliente.email) {
      const { sendEmail } = await import("../lib/brevo.js");
      const nomeEstab = barbearia.nome || "Glow Upi";
      sendEmail({
        to: [{ email: cliente.email, name: clienteNome }],
        subject: `${nomeEstab} — Agendamento Confirmado`,
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>Olá <strong>${clienteNome}</strong>, seu agendamento de <strong>${servico.nome}</strong> com <strong>${profissional.nomeExibicao}</strong> para o dia <strong>${data}</strong> às <strong>${horaInicio}</strong> foi confirmado com sucesso!</p></div>`,
      }).catch(err => console.error("[Notif] Error sending booking email to client:", err));
    }

    if (gestorNotifHabilitada) {
      const { sendEmail } = await import("../lib/brevo.js");
      const { usersTable } = await import("@workspace/db/schema");
      const nomeEstab = barbearia.nome || "Glow Upi";
      const gestores = await db.select().from(usersTable).where(
        and(eq(usersTable.barbeariaId, barbearia.id), eq(usersTable.role, "gerente"))
      );
      const donoUsers = await db.select().from(usersTable).where(eq(usersTable.role, "dono"));
      const allGestores = [...gestores];
      for (const d of donoUsers) {
        if (d.barbeariaId) continue;
        const [b] = await db.select({ id: barbeariasTable.id }).from(barbeariasTable).where(eq(barbeariasTable.donoId, d.id)).limit(1);
        if (b?.id === barbearia.id) allGestores.push(d);
      }
      for (const g of allGestores) {
        if (g.email) {
          sendEmail({
            to: [{ email: g.email, name: g.nome || "Gestor" }],
            subject: `${nomeEstab} — Novo agendamento pelo site: ${clienteNome}`,
            htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>O cliente <strong>${clienteNome}</strong> agendou <strong>${servico.nome}</strong> com <strong>${profissional.nomeExibicao}</strong> para o dia <strong>${data}</strong> às <strong>${horaInicio}</strong> pelo link público.</p></div>`,
          }).catch(err => console.error("[Notif] Error sending booking email to manager:", err));
        }
      }
    }

    sendPushToBarbearia(barbearia.id, {
      title: statusInicialSimples === "pendente_aprovacao" ? "Aguardando confirmação" : "Novo Agendamento pelo Site",
      body: statusInicialSimples === "pendente_aprovacao"
        ? `${clienteNome} solicitou ${servico.nome} com ${profissional.nomeExibicao} em ${data} às ${horaInicio}. Confirme ou recuse.`
        : `${clienteNome} agendou ${servico.nome} com ${profissional.nomeExibicao} em ${data} às ${horaInicio}`,
      data: { agendamentoId: agend.id, type: statusInicialSimples === "pendente_aprovacao" ? "pending_appointment" : "new_appointment", url: "/agenda" },
    }).catch(err => console.error("[Push] Error on client booking:", err));

    let sinalPagamentoSimples: any = null;
    if (barbearia.prePagamentoAtivo) {
      try {
        const { getContaByBarbearia, createPaymentForBarbearia } = await import("../lib/asaasService.js");
        const conta = await getContaByBarbearia(barbearia.id);
        if (conta) {
          const valorServicoS = parseFloat(String(servico.preco || "0"));
          const sinalModoS = barbearia.sinalModo || "percentual";
          const sinalValorBaseS = parseFloat(String(barbearia.sinalValor || "0"));
          const sinalValorS = sinalModoS === "valor"
            ? Math.max(0.5, sinalValorBaseS)
            : Math.max(0.5, Number(((valorServicoS * sinalValorBaseS) / 100).toFixed(2)));
          const dueS = new Date(); dueS.setDate(dueS.getDate() + 1);
          const resultS = await createPaymentForBarbearia({
            barbeariaId: barbearia.id,
            tipo: "agendamento",
            refType: "agendamento",
            refId: agend.id,
            billingType: "PIX",
            value: sinalValorS,
            dueDate: dueS.toISOString().slice(0, 10),
            description: `Sinal — ${servico.nome} com ${profissional.nomeExibicao} (${data} ${horaInicio})`,
            payer: { nome: clienteNome, telefone: whatsappLimpo },
            externalReference: `agend-${agend.id}`,
          });
          await db.update(agendamentosTable).set({
            sinalStatus: "aguardando",
            sinalValorDevido: String(sinalValorS),
            sinalAsaasPaymentId: resultS.pagamento.asaasPaymentId,
            sinalInformadoEm: new Date(),
            sinalExpiraEm: resultS.pixData?.expirationDate ? new Date(resultS.pixData.expirationDate) : null,
            updatedAt: new Date(),
          }).where(eq(agendamentosTable.id, agend.id));
          sinalPagamentoSimples = {
            asaasPaymentId: resultS.pagamento.asaasPaymentId,
            valor: sinalValorS,
            pixQrCodeBase64: resultS.pixData?.encodedImage || null,
            pixCopyPaste: resultS.pixData?.payload || null,
            invoiceUrl: resultS.asaasPayment?.invoiceUrl || null,
            expiraEm: resultS.pixData?.expirationDate || null,
          };
        }
      } catch (sinalErrS) {
        console.error("[public/agendar-simples] erro gerando sinal Asaas:", sinalErrS);
      }
    }

    return res.status(201).json({
      ...agend,
      valor: parseFloat(agend.valor as string),
      createdAt: agend.createdAt?.toISOString(),
      updatedAt: agend.updatedAt?.toISOString(),
      sinalPagamento: sinalPagamentoSimples,
    });
  } catch (e) {
    console.error("public agendar-simples error:", e);
    return res.status(500).json({ error: "Erro ao criar agendamento" });

  }
});

router.get("/:slug/manifest.json", async (req, res) => {
  try {
    const { slug } = req.params;
    const [barbearia] = await db
      .select()
      .from(barbeariasTable)
      .where(eq(barbeariasTable.slug, slug))
      .limit(1);
    if (!barbearia)
      return res.status(404).json({ error: "Barbearia não encontrada" });

    const basePath = process.env.BASE_PATH || "/";
    const icons: { src: string; sizes: string; type?: string; purpose: string }[] = [];
    if (barbearia.logoUrl) {
      icons.push(
        { src: barbearia.logoUrl, sizes: "192x192", purpose: "any" },
        { src: barbearia.logoUrl, sizes: "512x512", purpose: "any" },
        { src: barbearia.logoUrl, sizes: "192x192", purpose: "maskable" },
        { src: barbearia.logoUrl, sizes: "512x512", purpose: "maskable" },
      );
    } else {
      icons.push(
        { src: `${basePath}logo-icon.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      );
    }
    const manifest = {
      name: barbearia.nome,
      short_name: barbearia.nome.length > 12 ? barbearia.nome.slice(0, 12) : barbearia.nome,
      description: barbearia.descricaoPublica || `Agende com ${barbearia.nome}`,
      start_url: `${basePath}agendar/${slug}`,
      scope: basePath,
      display: "standalone",
      background_color: "#111111",
      theme_color: barbearia.corPrimaria || "#C4943C",
      icons,
    };

    res.setHeader("Content-Type", "application/manifest+json");
    res.json(manifest);
  } catch (e) {
    console.error("manifest.json error:", e);
    res.status(500).json({ error: "Erro ao gerar manifest" });
  }
});

router.get("/:slug/config", async (req, res) => {
  try {
    const { slug } = req.params;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });
    const { getParametros: getParams } = await import("../lib/parametros.js");
    const params = await getParams(barbearia.id);
    return res.json({
      mensagensAgendamentoHabilitadas: params["notif_cliente_mensagem"] === "Sim",
    });
  } catch (e) {
    console.error("public config error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/:slug/meus-agendamentos", requireClient, async (req, res) => {
  try {
    const { slug } = req.params;
    const clienteUser = (req as any).clienteUser;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const [cliente] = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbearia.id), eq(clientesTable.email, clienteUser.email))
    ).limit(1);
    if (!cliente) return res.json([]);

    const agendamentos = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbearia.id),
        eq(agendamentosTable.clienteId, cliente.id),
        gte(agendamentosTable.data, todayStr),
        eq(agendamentosTable.status, "confirmado")
      )
    );

    const futureOnly = agendamentos.filter(a => {
      const agendDateTime = new Date(a.data + "T" + a.horaFim + ":00");
      return agendDateTime.getTime() > now.getTime();
    });

    return res.json(futureOnly.map(a => ({
      id: a.id,
      servicoNome: a.servicoNome,
      profissionalNome: a.profissionalNome,
      data: a.data,
      horaInicio: a.horaInicio,
      horaFim: a.horaFim,
      status: a.status,
      valor: parseFloat(a.valor as string),
    })).sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return a.horaInicio.localeCompare(b.horaInicio);
    }));
  } catch (e) {
    console.error("public meus-agendamentos error:", e);
    return res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
});

router.post("/:slug/agendamentos/:id/cancelar", requireClient, async (req, res) => {
  try {
    const { slug, id } = req.params;
    const agendamentoId = parseInt(id);
    const clienteUser = (req as any).clienteUser;
    if (isNaN(agendamentoId)) return res.status(400).json({ error: "ID inválido" });

    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const { getParametros } = await import("../lib/parametros.js");
    const params = await getParametros(barbearia.id);

    if ((params["cancel_permitir_cliente_link_publico"] ?? "Sim") === "Não") {
      return res.status(403).json({ error: "Cancelamento pelo cliente não está habilitado" });
    }

    const [cliente] = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbearia.id), eq(clientesTable.email, clienteUser.email))
    ).limit(1);
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

    const [agend] = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.id, agendamentoId),
        eq(agendamentosTable.barbeariaId, barbearia.id),
        eq(agendamentosTable.clienteId, cliente.id),
        eq(agendamentosTable.status, "confirmado")
      )
    ).limit(1);
    if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

    if (agend.data && agend.horaInicio) {
      const agendDate = new Date(agend.data + "T" + agend.horaInicio + ":00");
      const agora = new Date();
      const diffMs = agendDate.getTime() - agora.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      if (diffHoras < 0) {
        return res.status(400).json({ error: "Não é possível cancelar um agendamento que já passou" });
      }
      const toleranciaHoras = parseInt(params["cancel_tolerancia_cliente"] || "2");
      if (diffHoras < toleranciaHoras) {
        return res.status(400).json({ error: `Não é possível cancelar com menos de ${toleranciaHoras} hora(s) de antecedência` });
      }
    }

    await db.update(agendamentosTable).set({ status: "cancelado", updatedAt: new Date() }).where(
      and(eq(agendamentosTable.id, agendamentoId), eq(agendamentosTable.barbeariaId, barbearia.id))
    );

    const { sendEmail } = await import("../lib/brevo.js");
    const nomeEstab = barbearia.nome || "Glow Upi";
    const gestorNotifHabilitada = (params["notif_mensagem_gestores"] || "Habilitado") === "Habilitado";
    const clienteNotifHabilitada = (params["notif_mensagem_agendar_cancelar"] || "Habilitado") === "Habilitado";

    if (clienteNotifHabilitada && cliente.email) {
      sendEmail({
        to: [{ email: cliente.email, name: agend.clienteNome }],
        subject: `${nomeEstab} — Agendamento Cancelado`,
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>Seu agendamento de <strong>${agend.servicoNome}</strong> com <strong>${agend.profissionalNome}</strong> em ${agend.data} às ${agend.horaInicio} foi cancelado.</p></div>`,
      }).catch(err => console.error("[Notif] Error sending cancel email to client:", err));
    }

    if (gestorNotifHabilitada) {
      const { usersTable } = await import("@workspace/db/schema");
      const gestores = await db.select().from(usersTable).where(
        and(eq(usersTable.barbeariaId, barbearia.id), eq(usersTable.role, "gerente"))
      );
      const donoUsers = await db.select().from(usersTable).where(eq(usersTable.role, "dono"));
      const allGestores = [...gestores];
      for (const d of donoUsers) {
        if (d.barbeariaId) continue;
        const [b] = await db.select({ id: barbeariasTable.id }).from(barbeariasTable).where(eq(barbeariasTable.donoId, d.id)).limit(1);
        if (b?.id === barbearia.id) allGestores.push(d);
      }
      for (const g of allGestores) {
        if (g.email) {
          sendEmail({
            to: [{ email: g.email, name: g.nome || "Gestor" }],
            subject: `${nomeEstab} — Agendamento cancelado pelo cliente: ${agend.clienteNome}`,
            htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>O cliente <strong>${agend.clienteNome}</strong> cancelou o agendamento de <strong>${agend.servicoNome}</strong> com <strong>${agend.profissionalNome}</strong> em ${agend.data} às ${agend.horaInicio} pelo link público.</p></div>`,
          }).catch(err => console.error("[Notif] Error sending cancel email to manager:", err));
        }
      }
    }

    sendPushToBarbearia(barbearia.id, {
      title: "Agendamento Cancelado pelo Cliente",
      body: `${agend.clienteNome} cancelou ${agend.servicoNome} com ${agend.profissionalNome} em ${agend.data} às ${agend.horaInicio}`,
      data: { agendamentoId: agend.id, type: "cancelled_appointment", url: "/agenda" },
    }).catch(err => console.error("[Push] Error on client cancelled appointment:", err));

    return res.json({ success: true, message: "Agendamento cancelado com sucesso" });
  } catch (e) {
    console.error("public cancelar error:", e);
    return res.status(500).json({ error: "Erro ao cancelar agendamento" });
  }
});

router.post("/:slug/agendamentos-por-whatsapp", async (req, res) => {
  try {
    const { slug } = req.params;
    const { whatsapp } = req.body;
    if (!whatsapp) return res.status(400).json({ error: "WhatsApp é obrigatório" });

    const whatsappLimpo = whatsapp.replace(/\D/g, "");
    if (whatsappLimpo.length < 10) return res.status(400).json({ error: "Número inválido" });

    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const { getParametros } = await import("../lib/parametros.js");
    const params = await getParametros(barbearia.id);
    if (params["agenda_tipo_link"] !== "Sem login (simples)") {
      return res.status(403).json({ error: "Esta funcionalidade não está disponível" });
    }

    const [cliente] = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbearia.id), eq(clientesTable.telefone, whatsappLimpo))
    ).limit(1);
    if (!cliente) return res.json([]);

    const today = new Date().toISOString().slice(0, 10);
    const agendamentos = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbearia.id),
        eq(agendamentosTable.clienteId, cliente.id),
        eq(agendamentosTable.status, "confirmado"),
        gte(agendamentosTable.data, today)
      )
    );

    return res.json(agendamentos.map(a => ({
      id: a.id,
      servicoNome: a.servicoNome,
      profissionalNome: a.profissionalNome,
      data: a.data,
      horaInicio: a.horaInicio,
      horaFim: a.horaFim,
      status: a.status,
    })).sort((a, b) => a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio)));
  } catch (e) {
    console.error("agendamentos-por-whatsapp error:", e);
    return res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
});

router.post("/:slug/agendamentos/:id/cancelar-simples", async (req, res) => {
  try {
    const { slug, id } = req.params;
    const { whatsapp } = req.body;
    const agendamentoId = parseInt(id);
    if (isNaN(agendamentoId) || !whatsapp) return res.status(400).json({ error: "Dados inválidos" });

    const whatsappLimpo = whatsapp.replace(/\D/g, "");
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const { getParametros } = await import("../lib/parametros.js");
    const params = await getParametros(barbearia.id);
    if (params["agenda_tipo_link"] !== "Sem login (simples)") {
      return res.status(403).json({ error: "Funcionalidade não disponível" });
    }
    if ((params["cancel_permitir_cliente_link_publico"] ?? "Sim") === "Não") {
      return res.status(403).json({ error: "Cancelamento pelo cliente não está habilitado" });
    }

    const [cliente] = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbearia.id), eq(clientesTable.telefone, whatsappLimpo))
    ).limit(1);
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

    const [agend] = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.id, agendamentoId),
        eq(agendamentosTable.barbeariaId, barbearia.id),
        eq(agendamentosTable.clienteId, cliente.id),
        eq(agendamentosTable.status, "confirmado")
      )
    ).limit(1);
    if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

    if (agend.data && agend.horaInicio) {
      const agendDate = new Date(agend.data + "T" + agend.horaInicio + ":00");
      const diffMs = agendDate.getTime() - Date.now();
      if (diffMs < 0) return res.status(400).json({ error: "Não é possível cancelar um agendamento que já passou" });
      const toleranciaHoras = parseInt(params["cancel_tolerancia_cliente"] || "2");
      if (diffMs / (1000 * 60 * 60) < toleranciaHoras) {
        return res.status(400).json({ error: `Não é possível cancelar com menos de ${toleranciaHoras} hora(s) de antecedência` });
      }
    }

    await db.update(agendamentosTable).set({ status: "cancelado", updatedAt: new Date() }).where(
      and(eq(agendamentosTable.id, agendamentoId), eq(agendamentosTable.barbeariaId, barbearia.id))
    );

    sendPushToBarbearia(barbearia.id, {
      title: "Agendamento Cancelado pelo Cliente",
      body: `${agend.clienteNome} cancelou ${agend.servicoNome} com ${agend.profissionalNome} em ${agend.data} às ${agend.horaInicio}`,
      data: { agendamentoId: agend.id, type: "cancelled_appointment", url: "/agenda" },
    }).catch(err => console.error("[Push] Error on simple cancel:", err));

    return res.json({ success: true, message: "Agendamento cancelado com sucesso" });
  } catch (e) {
    console.error("cancelar-simples error:", e);
    return res.status(500).json({ error: "Erro ao cancelar agendamento" });
  }
});

export default router;
