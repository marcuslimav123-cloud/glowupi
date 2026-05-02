import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

const RC_WEBHOOK_AUTH = process.env.REVENUECAT_WEBHOOK_AUTH || "";

router.post("/webhook", async (req: any, res) => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    if (!RC_WEBHOOK_AUTH) {
      if (isProd) {
        console.error("[RevenueCat] REVENUECAT_WEBHOOK_AUTH não configurado em produção — bloqueando webhook");
        return res.status(503).json({ error: "webhook auth not configured" });
      }
      console.warn("[RevenueCat] REVENUECAT_WEBHOOK_AUTH ausente — aceitando em dev");
    } else {
      const provided = req.headers.authorization;
      if (provided !== `Bearer ${RC_WEBHOOK_AUTH}`) {
        return res.status(401).json({ error: "unauthorized" });
      }
    }

    const event = req.body?.event;
    if (!event) return res.status(400).json({ error: "no event" });

    const appUserId = event.app_user_id || event.original_app_user_id;
    const productId = event.product_id;
    const expiresMs = event.expiration_at_ms;
    const type: string = event.type || "";

    if (!appUserId) {
      console.warn("[RevenueCat] event sem app_user_id", type);
      return res.json({ received: true });
    }

    const userId = parseInt(String(appUserId).replace(/^user_/, ""), 10);
    if (!Number.isFinite(userId)) {
      console.warn("[RevenueCat] app_user_id inválido:", appUserId);
      return res.json({ received: true });
    }

    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, userId)).limit(1);
    if (!barbearia) {
      console.warn("[RevenueCat] barbearia não encontrada para userId:", userId);
      return res.json({ received: true });
    }

    let iapStatus = barbearia.iapStatus || null;
    let subscriptionStatus = barbearia.subscriptionStatus || "trial";
    let planoStatus = barbearia.planoStatus || "ativo";

    switch (type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION":
        iapStatus = "active";
        subscriptionStatus = "active";
        planoStatus = "ativo";
        break;
      case "CANCELLATION":
        iapStatus = "cancelled";
        break;
      case "EXPIRATION":
        iapStatus = "expired";
        subscriptionStatus = "canceled";
        planoStatus = "vencido";
        break;
      case "BILLING_ISSUE":
        iapStatus = "billing_issue";
        subscriptionStatus = "past_due";
        break;
      case "SUBSCRIBER_ALIAS":
      case "TRANSFER":
      case "TEST":
      default:
        break;
    }

    await db.update(barbeariasTable).set({
      revenuecatCustomerId: appUserId,
      iapStatus,
      iapProductId: productId || barbearia.iapProductId,
      iapExpiresAt: expiresMs ? new Date(expiresMs) : barbearia.iapExpiresAt,
      subscriptionStatus,
      planoStatus,
      planoVencimento: expiresMs ? new Date(expiresMs) : barbearia.planoVencimento,
      updatedAt: new Date(),
    }).where(eq(barbeariasTable.id, barbearia.id));

    return res.json({ received: true });
  } catch (err: any) {
    console.error("[RevenueCat] webhook error:", err?.message || err);
    return res.status(500).json({ error: "webhook error" });
  }
});

router.get("/config", requireAuth, async (req: any, res) => {
  const apiKeyIos = process.env.REVENUECAT_API_KEY_IOS || "";
  const offeringId = process.env.REVENUECAT_OFFERING_ID || "default";
  const userId = req.user?.id;
  if (!apiKeyIos) {
    return res.status(503).json({
      error: "RevenueCat não configurado",
      configured: false,
    });
  }
  return res.json({
    configured: true,
    apiKeyIos,
    offeringId,
    appUserId: userId ? `user_${userId}` : null,
  });
});

router.post("/sync", requireAuth, async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "não autenticado" });

  const { entitlements, productId, expiresAtMs } = req.body || {};
  const isPro = !!entitlements?.pro?.isActive || !!entitlements?.includes?.("pro");

  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, userId)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "barbearia não encontrada" });

  if (isPro) {
    await db.update(barbeariasTable).set({
      revenuecatCustomerId: `user_${userId}`,
      iapStatus: "active",
      iapProductId: productId || barbearia.iapProductId,
      iapExpiresAt: expiresAtMs ? new Date(expiresAtMs) : barbearia.iapExpiresAt,
      subscriptionStatus: "active",
      planoStatus: "ativo",
      planoVencimento: expiresAtMs ? new Date(expiresAtMs) : barbearia.planoVencimento,
      updatedAt: new Date(),
    }).where(eq(barbeariasTable.id, barbearia.id));
  }

  return res.json({ ok: true, isPro });
});

export default router;
