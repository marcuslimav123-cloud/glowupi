import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  asaasContasTable, asaasWebhookEventsTable, pagamentosAsaasTable,
  agendamentosTable, comandasTable, assinaturasAsaasTable, barbeariasTable,
} from "@workspace/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { updatePagamentoFromAsaas, isPaidStatus, processPagamentoPago } from "../lib/asaasService.js";

const router: IRouter = Router();

router.post("/asaas/platform", async (req, res) => {
  const expected = process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN || "";
  if (!expected) {
    console.error("[asaas/webhook/platform] ASAAS_PLATFORM_WEBHOOK_TOKEN não configurado — rejeitando");
    return res.status(503).json({ error: "Webhook plataforma não configurado" });
  }
  const tokenHeader = req.header("asaas-access-token") || req.header("asaas-Access-Token") || "";
  if (tokenHeader !== expected) {
    console.warn("[asaas/webhook/platform] token inválido");
    return res.status(401).json({ error: "Token inválido" });
  }

  const evento = req.body?.event || "UNKNOWN";
  const subscription = req.body?.subscription;
  const payment = req.body?.payment;
  const subscriptionId = subscription?.id || payment?.subscription || null;
  const paymentId = payment?.id || null;
  if (!subscriptionId) {
    return res.status(200).json({ received: true, ignored: "sem subscriptionId" });
  }

  const dedupeKey = `platform|${evento}|${paymentId || ""}|${subscriptionId}`;
  const existing = await db.select().from(asaasWebhookEventsTable).where(
    and(isNull(asaasWebhookEventsTable.asaasContaId), eq(asaasWebhookEventsTable.dedupeKey, dedupeKey))
  ).limit(1);
  let eventRowId: number | null = null;
  if (existing[0]) {
    if (existing[0].processadoEm) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    eventRowId = existing[0].id;
  } else {
    try {
      const [row] = await db.insert(asaasWebhookEventsTable).values({
        asaasContaId: null,
        evento,
        paymentId,
        subscriptionId,
        dedupeKey,
        payload: req.body,
      }).returning({ id: asaasWebhookEventsTable.id });
      eventRowId = row.id;
    } catch (e) {
      console.log(`[asaas/webhook/platform] insert race ${dedupeKey}, tratando como duplicado`);
      return res.status(200).json({ received: true, duplicate: true });
    }
  }

  const [a] = await db.select().from(assinaturasAsaasTable)
    .where(eq(assinaturasAsaasTable.asaasSubscriptionId, subscriptionId)).limit(1);
  if (!a) {
    console.warn(`[asaas/webhook/platform] assinatura desconhecida ${subscriptionId}`);
    if (eventRowId) {
      await db.update(asaasWebhookEventsTable).set({ processadoEm: new Date(), erro: "subscription desconhecida" })
        .where(eq(asaasWebhookEventsTable.id, eventRowId));
    }
    return res.status(200).json({ received: true, ignored: "subscription desconhecida" });
  }

  try {
    if (subscription) {
      await onSubscriptionEvent(a.barbeariaId, evento, subscription);
    } else if (payment && evento.startsWith("PAYMENT_")) {
      const paid = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(String(payment.status).toUpperCase());
      if (paid) {
        await onSubscriptionEvent(a.barbeariaId, "SUBSCRIPTION_PAYMENT_RECEIVED", {
          id: subscriptionId, status: "ACTIVE", nextDueDate: payment.nextDueDate,
        });
      }
    }
    if (eventRowId) {
      await db.update(asaasWebhookEventsTable).set({ processadoEm: new Date() })
        .where(eq(asaasWebhookEventsTable.id, eventRowId));
    }
    return res.status(200).json({ received: true });
  } catch (e: any) {
    console.error("[asaas/webhook/platform] erro:", e);
    if (eventRowId) {
      await db.update(asaasWebhookEventsTable).set({ erro: String(e?.message || "erro").slice(0, 500) })
        .where(eq(asaasWebhookEventsTable.id, eventRowId));
    }
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/asaas/:barbeariaId", async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "barbeariaId inválido" });

  const tokenHeader = req.header("asaas-access-token") || req.header("asaas-Access-Token") || "";

  const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1);
  if (!conta) {
    console.warn(`[asaas/webhook] barbeariaId=${barbeariaId} sem conta`);
    return res.status(404).json({ error: "Conta não encontrada" });
  }

  if (conta.webhookToken && conta.webhookToken !== tokenHeader) {
    console.warn(`[asaas/webhook] token inválido para barbeariaId=${barbeariaId}`);
    return res.status(401).json({ error: "Token inválido" });
  }

  const evento = req.body?.event || "UNKNOWN";
  const payment = req.body?.payment;
  const subscription = req.body?.subscription;
  const paymentId = payment?.id || null;
  const subscriptionId = subscription?.id || (payment?.subscription ?? null);

  const dedupeKey = `${evento}|${paymentId || "-"}|${subscriptionId || "-"}`;

  const [existingDup] = await db.select()
    .from(asaasWebhookEventsTable)
    .where(and(
      eq(asaasWebhookEventsTable.asaasContaId, conta.id),
      eq(asaasWebhookEventsTable.dedupeKey, dedupeKey),
    ))
    .limit(1);

  let eventRowId: number;
  if (existingDup) {
    if (existingDup.processadoEm) {
      console.log(`[asaas/webhook] já processado ${dedupeKey}`);
      return res.status(200).json({ received: true, duplicate: true });
    }
    console.log(`[asaas/webhook] retry de evento não processado ${dedupeKey}`);
    eventRowId = existingDup.id;
    await db.update(asaasWebhookEventsTable).set({ erro: null, payload: req.body })
      .where(eq(asaasWebhookEventsTable.id, eventRowId));
  } else {
    try {
      const [row] = await db.insert(asaasWebhookEventsTable).values({
        asaasContaId: conta.id,
        evento,
        paymentId,
        subscriptionId,
        dedupeKey,
        payload: req.body,
      }).returning({ id: asaasWebhookEventsTable.id });
      eventRowId = row.id;
    } catch (e: any) {
      console.log(`[asaas/webhook] insert race ${dedupeKey}, tratando como duplicado`);
      return res.status(200).json({ received: true, duplicate: true });
    }
  }

  try {
    if (payment && paymentId) {
      let verifiedPayment = payment;
      if (isPaidStatus(payment.status)) {
        try {
          const { getClientForBarbearia } = await import("../lib/asaasService.js");
          const ctx = await getClientForBarbearia(barbeariaId);
          if (ctx) {
            const live = await ctx.client.getPayment(paymentId);
            if (live && !isPaidStatus(live.status)) {
              console.warn(`[asaas/webhook] payload alega pago mas Asaas retorna ${live.status} para ${paymentId} — ignorando state change`);
              verifiedPayment = live;
            } else if (live) {
              verifiedPayment = live;
            }
          }
        } catch (verifyErr) {
          console.error(`[asaas/webhook] falha ao re-verificar pagamento ${paymentId}:`, verifyErr);
        }
      }
      const updated = await updatePagamentoFromAsaas(paymentId, verifiedPayment);
      if (updated && isPaidStatus(verifiedPayment.status)) {
        await processPagamentoPago(barbeariaId, updated);
      }
    }

    if (subscription && subscriptionId && !payment) {
      await onSubscriptionEvent(barbeariaId, evento, subscription);
    }

    if (eventRowId) {
      await db.update(asaasWebhookEventsTable).set({ processadoEm: new Date() })
        .where(eq(asaasWebhookEventsTable.id, eventRowId));
    }

    return res.status(200).json({ received: true });
  } catch (e: any) {
    console.error("[asaas/webhook] erro processando:", e);
    if (eventRowId) {
      await db.update(asaasWebhookEventsTable).set({ erro: e?.message?.slice(0, 500) || "erro" })
        .where(eq(asaasWebhookEventsTable.id, eventRowId));
    }
    return res.status(500).json({ error: "Erro interno" });
  }
});

async function onSubscriptionEvent(_barbeariaId: number, evento: string, subscription: any) {
  const subId = subscription?.id;
  if (!subId) return;
  const status = subscription.status;
  const proximoVencimento = subscription.nextDueDate;
  const [updated] = await db.update(assinaturasAsaasTable).set({
    status: status || "ACTIVE",
    proximoVencimento: proximoVencimento || undefined,
    updatedAt: new Date(),
  }).where(eq(assinaturasAsaasTable.asaasSubscriptionId, subId)).returning();

  if (!updated) return;

  const isActive = ["ACTIVE", "RECEIVED", "CONFIRMED"].includes(String(status).toUpperCase());
  const isCancelled = ["CANCELLED", "EXPIRED", "OVERDUE", "INACTIVE"].includes(String(status).toUpperCase())
    || evento === "SUBSCRIPTION_CANCELLED" || evento === "SUBSCRIPTION_DELETED";

  if (isActive) {
    await db.update(barbeariasTable).set({
      subscriptionStatus: "active",
      subscriptionPlan: updated.plano,
      subscriptionPeriod: updated.periodo,
      planoStatus: "ativo",
      updatedAt: new Date(),
    }).where(eq(barbeariasTable.id, updated.barbeariaId));
  } else if (isCancelled) {
    await db.update(barbeariasTable).set({
      subscriptionStatus: "cancelled",
      planoStatus: "cancelado",
      updatedAt: new Date(),
    }).where(eq(barbeariasTable.id, updated.barbeariaId));
  }
}

export default router;
