import { db } from "@workspace/db";
import { agendamentosTable } from "@workspace/db/schema";
import { and, eq, lt, isNotNull } from "drizzle-orm";

const INTERVAL_MS = 10 * 60 * 1000;

async function runOnce() {
  try {
    const now = new Date();
    const expirados = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.sinalStatus, "aguardando"),
        isNotNull(agendamentosTable.sinalExpiraEm),
        lt(agendamentosTable.sinalExpiraEm, now),
      )
    );
    if (expirados.length === 0) return;
    for (const ag of expirados) {
      await db.update(agendamentosTable).set({
        sinalStatus: "expirado",
        status: "cancelado",
        updatedAt: now,
      }).where(eq(agendamentosTable.id, ag.id));
    }
    console.log(`[asaas-tolerance] Cancelados ${expirados.length} agendamento(s) por sinal expirado`);
  } catch (e) {
    console.error("[asaas-tolerance] erro:", e);
  }
}

export function startAsaasToleranceScheduler() {
  console.log(`[asaas-tolerance] Iniciado (cada ${INTERVAL_MS / 60000}min)`);
  setTimeout(runOnce, 30_000);
  setInterval(runOnce, INTERVAL_MS);
}
