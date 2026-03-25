import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agendamentosTable, profissionaisTable, servicosTable, barbeariasTable, bloqueiosHorarioTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function getProfScheduleForDate(prof: any, dateStr: string): { inicio: number; fim: number } | null {
  const date = new Date(dateStr + "T12:00:00");
  const diaSemana = DIAS_SEMANA[date.getDay()];

  const horarios = prof.horarios as any;
  if (!horarios) return { inicio: 8 * 60, fim: 20 * 60 };

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

  const params = await getParametros(barbeariaId);

  const slotSizeParam = params["agenda_tamanho_slots"] || "30min";
  const intervalo = slotSizeParam === "1h" ? 60 : (parseInt(slotSizeParam) || 30);

  const agendaInicio = params["agenda_horario_inicio"] || "08:00";
  const agendaFim = params["agenda_horario_fim"] || "20:00";

  const limiteFuturoDias = parseInt(params["agenda_limite_futuro_dias"] || "30");
  const dataReq = new Date((data as string) + "T12:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((dataReq.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias > limiteFuturoDias) {
    return res.json([]);
  }

  const slots: any[] = [];
  const duracao = servico.duracaoMinutos;

  for (const prof of profissionais) {
    const schedule = getProfScheduleForDate(prof, data as string);
    if (!schedule) continue;

    const { inicio: inicioTrabalho, fim: fimTrabalho } = schedule;

    for (let t = inicioTrabalho; t + duracao <= fimTrabalho; t += intervalo) {
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
      slots.push({
        horaInicio,
        horaFim,
        profissionalId: prof.id,
        profissionalNome: prof.nomeExibicao,
        disponivel: !ocupado && !bloqueado,
      });
    }
  }

  return res.json(slots);
});

export default router;
