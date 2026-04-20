export const DIAS_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export const JS_DAY_TO_INDEX = [6, 0, 1, 2, 3, 4, 5];

export type HorarioDia = {
  dia?: string;
  ativo: boolean;
  abertura: string;
  fechamento: string;
  intervaloInicio?: string;
  intervaloFim?: string;
};

export function timeToMinutes(t: string): number {
  if (!t || typeof t !== "string" || !t.includes(":")) return NaN;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h * 60 + m;
}

export function isTimeStr(t: any): t is string {
  return typeof t === "string" && /^\d{2}:\d{2}$/.test(t);
}

export function validateHorarioFuncionamento(horarios: HorarioDia[]): string | null {
  if (!Array.isArray(horarios)) return null;
  for (let i = 0; i < horarios.length; i++) {
    const d = horarios[i];
    if (!d?.ativo) continue;
    const label = d.dia || DIAS_LABELS[i] || `Dia ${i + 1}`;
    if (!isTimeStr(d.abertura) || !isTimeStr(d.fechamento)) {
      return `${label}: horário de abertura/fechamento inválido (use HH:MM)`;
    }
    const ab = timeToMinutes(d.abertura);
    const fe = timeToMinutes(d.fechamento);
    if (ab >= fe) {
      return `${label}: o horário de abertura (${d.abertura}) deve ser anterior ao fechamento (${d.fechamento})`;
    }
    const hasIntInicio = isTimeStr(d.intervaloInicio) && d.intervaloInicio !== "00:00";
    const hasIntFim = isTimeStr(d.intervaloFim) && d.intervaloFim !== "00:00";
    if (hasIntInicio !== hasIntFim) {
      return `${label}: defina o intervalo completo (início e fim) ou deixe ambos vazios`;
    }
    if (hasIntInicio && hasIntFim) {
      const ii = timeToMinutes(d.intervaloInicio!);
      const fi = timeToMinutes(d.intervaloFim!);
      if (ii >= fi) {
        return `${label}: início do intervalo (${d.intervaloInicio}) deve ser anterior ao fim (${d.intervaloFim})`;
      }
      if (ii < ab || fi > fe) {
        return `${label}: o intervalo (${d.intervaloInicio}–${d.intervaloFim}) precisa estar dentro do horário aberto (${d.abertura}–${d.fechamento})`;
      }
    }
  }
  return null;
}

export type ProfHorarioBlock = {
  diaSemana?: number;
  dia?: string | number;
  inicio: string;
  fim: string;
};

const DIA_KEY_TO_INDEX: Record<string, number> = {
  segunda: 0, terca: 1, "terça": 1, quarta: 2, quinta: 3, sexta: 4, sabado: 5, "sábado": 5, domingo: 6,
};

export function normalizeProfHorarios(profHorarios: any): ProfHorarioBlock[] {
  if (!profHorarios) return [];
  if (Array.isArray(profHorarios)) {
    return profHorarios as ProfHorarioBlock[];
  }
  const porDia = (profHorarios as any).porDia;
  if (porDia && typeof porDia === "object") {
    const out: ProfHorarioBlock[] = [];
    for (const [key, raw] of Object.entries(porDia)) {
      const cfg: any = raw;
      if (!cfg || cfg.folga) continue;
      const idx = DIA_KEY_TO_INDEX[key.toLowerCase()];
      if (idx === undefined) continue;
      if (!isTimeStr(cfg.inicio) || !isTimeStr(cfg.fim)) continue;
      out.push({ diaSemana: idx, inicio: cfg.inicio, fim: cfg.fim });
    }
    return out;
  }
  return [];
}

function profHasAnyDay(profHorarios: any, idx: number): boolean {
  const blocks = normalizeProfHorarios(profHorarios);
  return blocks.some(b => Number(b.diaSemana ?? b.dia) === idx);
}

export function validateProfHorariosFitBarbearia(
  profHorarios: any,
  barbHorarios: HorarioDia[] | null | undefined
): string | null {
  if (!profHorarios || !Array.isArray(barbHorarios) || barbHorarios.length === 0) return null;
  const blocks = normalizeProfHorarios(profHorarios);
  for (const block of blocks) {
    const idxRaw = block.diaSemana ?? block.dia;
    const idx = typeof idxRaw === "number" ? idxRaw : Number(idxRaw);
    if (isNaN(idx) || idx < 0 || idx > 6) continue;
    const dia = barbHorarios[idx];
    if (!dia) continue;
    const label = DIAS_LABELS[idx] || `Dia ${idx + 1}`;
    if (!dia.ativo) {
      return `${label}: o estabelecimento está fechado neste dia, mas o profissional tem horário cadastrado`;
    }
    if (!isTimeStr(block.inicio) || !isTimeStr(block.fim)) continue;
    const pi = timeToMinutes(block.inicio);
    const pf = timeToMinutes(block.fim);
    const ab = timeToMinutes(dia.abertura);
    const fe = timeToMinutes(dia.fechamento);
    if (pi < ab || pf > fe) {
      return `${label}: o horário do profissional (${block.inicio}–${block.fim}) está fora do funcionamento do estabelecimento (${dia.abertura}–${dia.fechamento})`;
    }
    if (pi >= pf) {
      return `${label}: o início (${block.inicio}) deve ser anterior ao fim (${block.fim})`;
    }
  }
  return null;
}

export function profsForaDaJanela(
  profs: Array<{ id: number; nomeExibicao: string; horarios: any }>,
  barbHorarios: HorarioDia[] | null | undefined
): Array<{ id: number; nome: string; motivo: string }> {
  if (!Array.isArray(barbHorarios) || barbHorarios.length === 0) return [];
  const out: Array<{ id: number; nome: string; motivo: string }> = [];
  for (const p of profs) {
    const motivo = validateProfHorariosFitBarbearia(p.horarios, barbHorarios);
    if (motivo) out.push({ id: p.id, nome: p.nomeExibicao, motivo });
  }
  return out;
}

export function validateAgendamentoEmHorario(
  data: string,
  horaInicio: string,
  horaFim: string,
  barbHorarios: HorarioDia[] | null | undefined
): string | null {
  if (!Array.isArray(barbHorarios) || barbHorarios.length === 0) return null;
  const d = new Date(data + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const idx = JS_DAY_TO_INDEX[d.getDay()];
  const dia = barbHorarios[idx];
  if (!dia) return null;
  const label = DIAS_LABELS[idx] || "Dia";
  if (!dia.ativo) {
    return `Estabelecimento fechado em ${label.toLowerCase()}. Escolha outro dia.`;
  }
  const hi = timeToMinutes(horaInicio);
  const hf = timeToMinutes(horaFim);
  const ab = timeToMinutes(dia.abertura);
  const fe = timeToMinutes(dia.fechamento);
  if (hi < ab || hf > fe) {
    return `Horário fora do funcionamento (${dia.abertura}–${dia.fechamento}).`;
  }
  if (isTimeStr(dia.intervaloInicio) && isTimeStr(dia.intervaloFim) && dia.intervaloInicio !== "00:00") {
    const ii = timeToMinutes(dia.intervaloInicio);
    const fi = timeToMinutes(dia.intervaloFim);
    if (ii < fi && hi < fi && hf > ii) {
      return `Horário coincide com intervalo do estabelecimento (${dia.intervaloInicio}–${dia.intervaloFim}).`;
    }
  }
  return null;
}

export function validateAgendamentoEmJornadaProf(
  data: string,
  horaInicio: string,
  horaFim: string,
  profHorarios: any
): string | null {
  if (!profHorarios) return null;
  const d = new Date(data + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const idx = JS_DAY_TO_INDEX[d.getDay()];
  const all = normalizeProfHorarios(profHorarios);
  if (all.length === 0) return null;
  const blocks: ProfHorarioBlock[] = all.filter((b: any) => Number(b.diaSemana ?? b.dia) === idx);
  if (blocks.length === 0) {
    return `O profissional não atende em ${DIAS_LABELS[idx].toLowerCase()}.`;
  }
  const hi = timeToMinutes(horaInicio);
  const hf = timeToMinutes(horaFim);
  const fits = blocks.some(b => {
    if (!isTimeStr(b.inicio) || !isTimeStr(b.fim)) return false;
    return hi >= timeToMinutes(b.inicio) && hf <= timeToMinutes(b.fim);
  });
  if (!fits) {
    const janelas = blocks.map(b => `${b.inicio}–${b.fim}`).join(", ");
    return `Horário fora da jornada do profissional (${janelas}).`;
  }
  return null;
}
