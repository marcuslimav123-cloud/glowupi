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

export async function incrementQuota(barbeariaId: number, modo: QuotaModo, qtd: number = 1): Promise<void> {
  const data = getBrasiliaDate();
  const existing = await db
    .select()
    .from(emailDailyQuotaTable)
    .where(and(
      eq(emailDailyQuotaTable.barbeariaId, barbeariaId),
      eq(emailDailyQuotaTable.data, data),
      eq(emailDailyQuotaTable.modo, modo),
    ))
    .limit(1);
  if (existing.length > 0) {
    await db.update(emailDailyQuotaTable)
      .set({ usado: sql`${emailDailyQuotaTable.usado} + ${qtd}` })
      .where(eq(emailDailyQuotaTable.id, existing[0].id));
  } else {
    await db.insert(emailDailyQuotaTable).values({ barbeariaId, data, modo, usado: qtd });
  }
}
