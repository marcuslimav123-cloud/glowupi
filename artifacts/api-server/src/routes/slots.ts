import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agendamentosTable, profissionaisTable, servicosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

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

  const slots: any[] = [];
  const intervalo = 30;
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
      slots.push({
        horaInicio,
        horaFim,
        profissionalId: prof.id,
        profissionalNome: prof.nomeExibicao,
        disponivel: !ocupado,
      });
    }
  }

  return res.json(slots);
});

export default router;
