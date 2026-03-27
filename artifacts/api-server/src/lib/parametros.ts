import { db } from "@workspace/db";
import { parametrosConfigTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export async function getParametro(barbeariaId: number, chave: string): Promise<string | null> {
  const [row] = await db.select().from(parametrosConfigTable).where(
    and(eq(parametrosConfigTable.barbeariaId, barbeariaId), eq(parametrosConfigTable.chave, chave))
  );
  return row?.valor ?? null;
}

export async function getParametros(barbeariaId: number): Promise<Record<string, string>> {
  const rows = await db.select().from(parametrosConfigTable).where(
    eq(parametrosConfigTable.barbeariaId, barbeariaId)
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.chave] = r.valor;
  return map;
}

export function getLocalNow(params: Record<string, string>): { todayStr: string; currentMinutes: number } {
  const DEFAULT_TZ = "America/Sao_Paulo";
  let tz = params["outros_fuso_horario"] || DEFAULT_TZ;
  const now = new Date();

  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    tz = DEFAULT_TZ;
  }

  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const year = dateParts.find(p => p.type === "year")!.value;
  const month = dateParts.find(p => p.type === "month")!.value;
  const day = dateParts.find(p => p.type === "day")!.value;
  const todayStr = `${year}-${month}-${day}`;

  const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const timeParts = timeFmt.formatToParts(now);
  const h = parseInt(timeParts.find(p => p.type === "hour")!.value, 10);
  const m = parseInt(timeParts.find(p => p.type === "minute")!.value, 10);

  return { todayStr, currentMinutes: h * 60 + m };
}
