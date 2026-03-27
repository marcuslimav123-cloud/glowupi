import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agendamentosTable, profissionaisTable, servicosTable, barbeariasTable, bloqueiosHorarioTable, profissionalServicosTable, equipamentosTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getParametros, getLocalNow } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DIAS_FUNC_INDEX = [6, 0, 1, 2, 3, 4, 5];

function getBarbeariaScheduleForDate(hf: any, dateStr: string): { aberto: boolean; inicio: number; fim: number; intervaloInicio?: number; intervaloFim?: number } | null {
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
    return {
      inicio: timeToMinutes(dia.inicio || "08:00"),
      fim: timeToMinutes(dia.fim || "20:00"),
    };
  }

  if (horarios.inicio && horarios.fim) {
    return {
      inicio: timeToMinutes(horarios.inicio),
      fim: timeToMinutes(horarios.fim),
    };
  }

  if (barbSchedule) return { inicio: barbSchedule.inicio, fim: barbSchedule.fim };
  return { inicio: 8 * 60, fim: 20 * 60 };
}

router.get("/", async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });
  const { data, profissionalId, servicoId } = req.query;
  if (!data || !servicoId) return res.status(400).json({ error: "data e servicoId são obrigatórios" });

  const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, parseInt(servicoId as string)), eq(servicosTable.barbeariaId, barbeariaId))).limit(1);
  if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });

  let profissionais;
  if (profissionalId) {
    profissionais = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, parseInt(profissionalId as string)), eq(profissionaisTable.barbeariaId, barbeariaId), eq(profissionaisTable.ativo, true)));
  } else {
    profissionais = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.barbeariaId, barbeariaId), eq(profissionaisTable.ativo, true)));
  }

  const agendamentos = await db.select().from(agendamentosTable).where(
    and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      eq(agendamentosTable.data, data as string),
      eq(agendamentosTable.status, "confirmado")
    )
  );

  const bloqueios = await db.select().from(bloqueiosHorarioTable).where(
    and(
      eq(bloqueiosHorarioTable.barbeariaId, barbeariaId),
      eq(bloqueiosHorarioTable.data, data as string),
    )
  );

  const servicoIdNum = parseInt(servicoId as string);
  const profServicoLinks = await db.select().from(profissionalServicosTable).where(
    and(eq(profissionalServicosTable.barbeariaId, barbeariaId), eq(profissionalServicosTable.servicoId, servicoIdNum))
  );
  const overrideByProf = new Map<number, { tempoOverride: number | null }>();
  for (const link of profServicoLinks) {
    overrideByProf.set(link.profissionalId, {
      tempoOverride: link.tempoOverride,
    });
  }

  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);

  const equipamentos = await db.select().from(equipamentosTable).where(
    and(eq(equipamentosTable.barbeariaId, barbeariaId), eq(equipamentosTable.ativo, true))
  );
  const equipamentosDoServico = equipamentos.filter(equip => {
    const ids = equip.servicosIds as number[];
    return Array.isArray(ids) && ids.includes(servicoIdNum);
  });

  const params = await getParametros(barbeariaId);

  const slotSizeParam = params["agenda_tamanho_slots"] || "30min";
  const intervalo = slotSizeParam === "1h" ? 60 : (parseInt(slotSizeParam) || 30);

  const limiteFuturoDias = parseInt(params["agenda_limite_futuro_dias"] || "30");
  const localNow = getLocalNow(params);
  const dataReq = new Date((data as string) + "T12:00:00");
  const hojeDate = new Date(localNow.todayStr + "T12:00:00");
  const diffDias = Math.ceil((dataReq.getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias > limiteFuturoDias) {
    return res.json([]);
  }

  const barbSchedule = barbearia ? getBarbeariaScheduleForDate(barbearia.horarioFuncionamento, data as string) : null;
  if (barbSchedule && !barbSchedule.aberto) {
    return res.json([]);
  }

  const limiteAntecedencia = parseInt(params["agenda_limite_antecedencia"] || "2");
  const hojeStr = localNow.todayStr;
  const agoraMinutos = localNow.currentMinutes;

  const slots: any[] = [];
  const duracaoPadrao = servico.duracaoMinutos;

  const effectiveGlobalInicio = barbSchedule ? barbSchedule.inicio : 8 * 60;
  const effectiveGlobalFim = barbSchedule ? barbSchedule.fim : 20 * 60;

  for (const prof of profissionais) {
    const schedule = getProfScheduleForDate(prof, data as string, barbSchedule);
    if (!schedule) continue;

    const override = overrideByProf.get(prof.id);
    const duracao = override?.tempoOverride ?? duracaoPadrao;

    const inicioTrabalho = Math.max(schedule.inicio, effectiveGlobalInicio);
    const fimTrabalho = Math.min(schedule.fim, effectiveGlobalFim);

    for (let t = inicioTrabalho; t + duracao <= fimTrabalho; t += intervalo) {
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
      const bloqueado = bloqueios.some(b => {
        if (b.profissionalId !== prof.id) return false;
        const bi = timeToMinutes(b.horaInicio);
        const bf = timeToMinutes(b.horaFim);
        return !(t + duracao <= bi || t >= bf);
      });
      let tooSoon = false;
      if ((data as string) === hojeStr) {
        tooSoon = t < agoraMinutos + limiteAntecedencia * 60;
      }

      let equipamentoIndisponivel = false;
      if (equipamentosDoServico.length > 0) {
        for (const equip of equipamentosDoServico) {
          const equipServicos = equip.servicosIds as number[];
          const usosConcorrentes = agendamentos.filter(a => {
            if (!equipServicos.includes(a.servicoId)) return false;
            const ai = timeToMinutes(a.horaInicio);
            const af = timeToMinutes(a.horaFim);
            return !(t + duracao <= ai || t >= af);
          }).length;
          if (usosConcorrentes >= equip.quantidadeMaxima) {
            equipamentoIndisponivel = true;
            break;
          }
        }
      }

      slots.push({
        horaInicio,
        horaFim,
        profissionalId: prof.id,
        profissionalNome: prof.apelido || prof.nomeExibicao,
        disponivel: !ocupado && !bloqueado && !tooSoon && !equipamentoIndisponivel,
      });
    }
  }

  return res.json(slots);
});

export default router;
