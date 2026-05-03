import { db } from "@workspace/db";
import { agendamentosTable, barbeariasTable, pagamentosAsaasTable } from "@workspace/db/schema";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { getClientForBarbearia, isPaidStatus, processPagamentoPago, updatePagamentoFromAsaas } from "./asaasService.js";

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
    let confirmadosTardios = 0;
    for (const ag of candidatos) {
      const tolMs = (ag.toleranciaMin ?? 30) * 60_000;
      const informado = ag.sinalInformadoEm ? new Date(ag.sinalInformadoEm).getTime() : 0;
      const expiraConfig = informado + tolMs;
      const expiraPix = ag.sinalExpiraEm ? new Date(ag.sinalExpiraEm).getTime() : Infinity;
      const limite = Math.min(expiraConfig, expiraPix);
      if (now.getTime() < limite) continue;

      const [agFull] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, ag.id)).limit(1);
      if (!agFull || agFull.sinalStatus !== "aguardando" || agFull.status === "cancelado") continue;

      let pagoConfirmado = false;
      if (agFull.sinalAsaasPaymentId) {
        try {
          const ctx = await getClientForBarbearia(ag.barbeariaId);
          if (ctx) {
            const live = await ctx.client.getPayment(agFull.sinalAsaasPaymentId);
            if (live && isPaidStatus(live.status)) {
              const updated = await updatePagamentoFromAsaas(agFull.sinalAsaasPaymentId, live);
              if (updated) {
                await processPagamentoPago(ag.barbeariaId, updated);
                pagoConfirmado = true;
                confirmadosTardios++;
              }
            }
          }
        } catch (verifyErr) {
          console.error(`[asaas-tolerance] falha ao re-verificar ${agFull.sinalAsaasPaymentId}:`, verifyErr instanceof Error ? verifyErr.message : verifyErr);
          continue;
        }
      }

      if (pagoConfirmado) continue;

      await db.update(agendamentosTable).set({
        sinalStatus: "expirado",
        status: "cancelado",
        updatedAt: now,
      }).where(and(eq(agendamentosTable.id, ag.id), eq(agendamentosTable.sinalStatus, "aguardando")));
      cancelados++;
    }
    if (confirmadosTardios > 0) {
      console.log(`[asaas-tolerance] Confirmados tardiamente ${confirmadosTardios} agendamento(s) (webhook atrasado)`);
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
