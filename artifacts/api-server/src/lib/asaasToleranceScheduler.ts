import { db } from "@workspace/db";
import { agendamentosTable, barbeariasTable } from "@workspace/db/schema";
import { and, eq, isNotNull, ne } from "drizzle-orm";

const INTERVAL_MS = 10 * 60 * 1000;

async function runOnce() {
  try {
    const now = new Date();
    const candidatos = await db.select({
      id: agendamentosTable.id,
      barbeariaId: agendamentosTable.barbeariaId,
      sinalInformadoEm: agendamentosTable.sinalInformadoEm,
      sinalExpiraEm: agendamentosTable.sinalExpiraEm,
      toleranciaMin: barbeariasTable.sinalToleranciaMin,
    })
      .from(agendamentosTable)
      .leftJoin(barbeariasTable, eq(barbeariasTable.id, agendamentosTable.barbeariaId))
      .where(and(
        eq(agendamentosTable.sinalStatus, "aguardando"),
        isNotNull(agendamentosTable.sinalInformadoEm),
        ne(agendamentosTable.status, "cancelado"),
      ));

    let cancelados = 0;
    for (const ag of candidatos) {
      const tolMs = (ag.toleranciaMin ?? 30) * 60_000;
      const informado = ag.sinalInformadoEm ? new Date(ag.sinalInformadoEm).getTime() : 0;
      const expiraConfig = informado + tolMs;
      const expiraPix = ag.sinalExpiraEm ? new Date(ag.sinalExpiraEm).getTime() : Infinity;
      const limite = Math.min(expiraConfig, expiraPix);
      if (now.getTime() < limite) continue;
      await db.update(agendamentosTable).set({
        sinalStatus: "expirado",
        status: "cancelado",
        updatedAt: now,
      }).where(eq(agendamentosTable.id, ag.id));
      cancelados++;
    }
    if (cancelados > 0) {
      console.log(`[asaas-tolerance] Cancelados ${cancelados} agendamento(s) por sinal expirado`);
    }
  } catch (e) {
    console.error("[asaas-tolerance] erro:", e);
  }
}

export function startAsaasToleranceScheduler() {
  console.log(`[asaas-tolerance] Iniciado (cada ${INTERVAL_MS / 60000}min)`);
  setTimeout(runOnce, 30_000);
  setInterval(runOnce, INTERVAL_MS);
}
