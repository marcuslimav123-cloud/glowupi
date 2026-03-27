import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable, servicosTable, profissionaisTable, agendamentosTable, clientesTable, avaliacoesTable, recompensasTable, produtosTable, profissionalServicosTable, pesquisaSatisfacaoTable, respostasPesquisaTable, categoriasServicoTable } from "@workspace/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireClient } from "../lib/auth.js";

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
    categorias,
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
    produtos: produtos.map(p => ({
      id: p.id,
      nome: p.nome,
      preco: parseFloat(p.preco as string),
    })),
  });
});

router.get("/:slug/slots", async (req, res) => {
  try {
    const { slug } = req.params;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

    const { data, profissionalId, servicoId } = req.query;
    if (!data || !servicoId) return res.status(400).json({ error: "data e servicoId são obrigatórios" });

    const sId = parseInt(servicoId as string);
    const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, sId), eq(servicosTable.barbeariaId, barbearia.id))).limit(1);
    if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });

    let profissionais;
    if (profissionalId) {
      const pId = parseInt(profissionalId as string);
      profissionais = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, pId), eq(profissionaisTable.barbeariaId, barbearia.id), eq(profissionaisTable.ativo, true)));
      if (profissionais.length > 0) {
        const profLinks = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, pId), eq(profissionalServicosTable.barbeariaId, barbearia.id)));
        if (profLinks.length > 0 && !profLinks.some(l => l.servicoId === sId)) {
          return res.json([]);
        }
      }
    } else {
      profissionais = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.barbeariaId, barbearia.id), eq(profissionaisTable.ativo, true)));

      const allLinks = await db.select().from(profissionalServicosTable).where(eq(profissionalServicosTable.barbeariaId, barbearia.id));
      const hasAnyLinks = allLinks.length > 0;
      if (hasAnyLinks) {
        const profIdsForService = new Set(allLinks.filter(l => l.servicoId === sId).map(l => l.profissionalId));
        profissionais = profissionais.filter(p => profIdsForService.has(p.id));
      }
    }

    const agendamentos = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.barbeariaId, barbearia.id), eq(agendamentosTable.data, data as string), eq(agendamentosTable.status, "confirmado"))
    );

    const { getParametros, getLocalNow } = await import("../lib/parametros.js");
    const params = await getParametros(barbearia.id);

    const slotSizeParam = params["agenda_tamanho_slots"] || "30min";
    const intervalo = slotSizeParam === "1h" ? 60 : (parseInt(slotSizeParam) || 30);
    const limiteAntecedenciaRaw = params["agenda_limite_antecedencia"];
    const limiteAntecedencia = limiteAntecedenciaRaw !== undefined ? parseFloat(limiteAntecedenciaRaw) : 0.5;
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

    const { profissionalId, servicoId, data, horaInicio, semPreferencia, observacao } = req.body;
    if (!profissionalId || !servicoId || !data || !horaInicio) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const { getParametros: getParams2, getLocalNow: getLocalNow2 } = await import("../lib/parametros.js");
    const params = await getParams2(barbearia.id);
    const localNow = getLocalNow2(params);

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
    const limiteAntecedencia = limiteAntecedenciaRaw2 !== undefined ? parseFloat(limiteAntecedenciaRaw2) : 0.5;
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
      [cliente] = await db.insert(clientesTable).values({
        barbeariaId: barbearia.id,
        nome: clienteUser.nome,
        telefone: clienteUser.telefone || "",
        email: clienteUser.email,
      }).returning();
    }

    const duracaoFinal = servico.duracaoMinutos || tempoPadrao;
    const horaFim = addMinutes(horaInicio, duracaoFinal);

    if (paramHoraInicio && horaInicio < paramHoraInicio) {
      return res.status(400).json({ error: `Horário antes do início permitido (${paramHoraInicio})` });
    }
    if (paramHoraFim && horaFim > paramHoraFim) {
      return res.status(400).json({ error: `Horário após o fim permitido (${paramHoraFim})` });
    }

    const [agend] = await db.insert(agendamentosTable).values({
      barbeariaId: barbearia.id,
      clienteId: cliente.id,
      clienteNome: clienteUser.nome,
      clienteTelefone: clienteUser.telefone || "",
      profissionalId,
      profissionalNome: profissional.nomeExibicao,
      servicoId,
      servicoNome: servico.nome,
      data,
      horaInicio,
      horaFim,
      status: "confirmado",
      valor: servico.preco,
      pago: false,
      semPreferencia: semPreferencia ?? false,
      observacao: observacao || null,
      aniversario: false,
      vip: false,
    }).returning();

    return res.status(201).json({
      ...agend,
      valor: parseFloat(agend.valor as string),
      createdAt: agend.createdAt?.toISOString(),
      updatedAt: agend.updatedAt?.toISOString(),
    });
  } catch (e) {
    console.error("public agendar error:", e);
    return res.status(500).json({ error: "Erro ao criar agendamento" });
  }
});

export default router;
