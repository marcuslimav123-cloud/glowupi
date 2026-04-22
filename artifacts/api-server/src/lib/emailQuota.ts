import { db } from "@workspace/db";
import { emailDailyQuotaTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const QUOTA_LIMITS: Record<string, number> = {
  massa: 100,
  manual: 200,
};

export type QuotaModo = "massa" | "manual";

function getBrasiliaDate(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

export async function getQuotaUsed(barbeariaId: number, modo: QuotaModo, data?: string): Promise<number> {
  const date = data || getBrasiliaDate();
  const [row] = await db
    .select()
    .from(emailDailyQuotaTable)
    .where(and(
      eq(emailDailyQuotaTable.barbeariaId, barbeariaId),
      eq(emailDailyQuotaTable.data, date),
      eq(emailDailyQuotaTable.modo, modo),
    ))
    .limit(1);
  return row?.usado || 0;
}

export async function getQuotaSummary(barbeariaId: number) {
  const date = getBrasiliaDate();
  const massa = await getQuotaUsed(barbeariaId, "massa", date);
  const manual = await getQuotaUsed(barbeariaId, "manual", date);
  return {
    data: date,
    massa: { usado: massa, limite: QUOTA_LIMITS.massa, restante: Math.max(0, QUOTA_LIMITS.massa - massa) },
    manual: { usado: manual, limite: QUOTA_LIMITS.manual, restante: Math.max(0, QUOTA_LIMITS.manual - manual) },
  };
}

export async function checkQuota(barbeariaId: number, modo: QuotaModo, qtd: number = 1): Promise<{ ok: boolean; restante: number; limite: number }> {
  const usado = await getQuotaUsed(barbeariaId, modo);
  const limite = QUOTA_LIMITS[modo];
  const restante = Math.max(0, limite - usado);
  return { ok: usado + qtd <= limite, restante, limite };
}

export async function incrementQuota(barbeariaId: number, modo: QuotaModo, qtd: number = 1): Promise<number> {
  const data = getBrasiliaDate();
  const result = await db
    .insert(emailDailyQuotaTable)
    .values({ barbeariaId, data, modo, usado: qtd })
    .onConflictDoUpdate({
      target: [emailDailyQuotaTable.barbeariaId, emailDailyQuotaTable.data, emailDailyQuotaTable.modo],
      set: { usado: sql`${emailDailyQuotaTable.usado} + ${qtd}` },
    })
    .returning({ usado: emailDailyQuotaTable.usado });
  return result[0]?.usado || 0;
}

export async function reserveQuota(barbeariaId: number, modo: QuotaModo, qtd: number): Promise<{ ok: boolean; usado: number; limite: number }> {
  const limite = QUOTA_LIMITS[modo];
  const usado = await incrementQuota(barbeariaId, modo, qtd);
  if (usado > limite) {
    await incrementQuota(barbeariaId, modo, -qtd);
    return { ok: false, usado: usado - qtd, limite };
  }
  return { ok: true, usado, limite };
}
