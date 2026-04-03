import { db } from "@workspace/db";
import { barbeariasTable } from "@workspace/db/schema";
import { eq, and, lt, isNotNull, sql } from "drizzle-orm";

export function startTrialExpiryJob() {
  const CHECK_INTERVAL = 60 * 60 * 1000;

  async function checkExpiredTrials() {
    try {
      const now = new Date();

      const expired = await db.select({ id: barbeariasTable.id, nome: barbeariasTable.nome })
        .from(barbeariasTable)
        .where(
          and(
            eq(barbeariasTable.subscriptionStatus, "trial"),
            isNotNull(barbeariasTable.planoVencimento),
            lt(barbeariasTable.planoVencimento, now),
            eq(barbeariasTable.ativo, true)
          )
        );

      if (expired.length > 0) {
        for (const b of expired) {
          await db.update(barbeariasTable).set({
            subscriptionStatus: "pendente",
            planoStatus: "pendente",
            updatedAt: now,
          }).where(eq(barbeariasTable.id, b.id));
          console.log(`[trial-expiry] Barbearia ${b.id} (${b.nome}) trial expirado → pendente`);
        }
      }

      const suspendGraceDays = 7;
      const graceDeadline = new Date(now.getTime() - suspendGraceDays * 24 * 60 * 60 * 1000);

      const inadimplentes = await db.select({ id: barbeariasTable.id, nome: barbeariasTable.nome })
        .from(barbeariasTable)
        .where(
          and(
            eq(barbeariasTable.subscriptionStatus, "inadimplente"),
            isNotNull(barbeariasTable.planoVencimento),
            lt(barbeariasTable.planoVencimento, graceDeadline),
            eq(barbeariasTable.ativo, true)
          )
        );

      if (inadimplentes.length > 0) {
        for (const b of inadimplentes) {
          await db.update(barbeariasTable).set({
            subscriptionStatus: "suspenso",
            planoStatus: "suspenso",
            ativo: false,
            updatedAt: now,
          }).where(eq(barbeariasTable.id, b.id));
          console.log(`[trial-expiry] Barbearia ${b.id} (${b.nome}) inadimplente > 7 dias → suspenso`);
        }
      }
    } catch (err) {
      console.error("[trial-expiry] Error:", err);
    }
  }

  checkExpiredTrials();
  setInterval(checkExpiredTrials, CHECK_INTERVAL);
  console.log("[trial-expiry] Scheduler started (every 1 hour)");
}
