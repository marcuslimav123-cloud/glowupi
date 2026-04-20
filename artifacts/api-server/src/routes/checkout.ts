import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { barbeariasTable, platformConfigTable } from "@workspace/db/schema";
import { stripeService } from "../stripeService.js";
import { stripeStorage } from "../stripeStorage.js";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient.js";
import { requireAuth, requireBarbearia } from "../lib/auth.js";
import { sendCapiEvent, purchaseEventId } from "../lib/fbCapi.js";
import { buildVerifyDirectSessionPurchaseEvent } from "../lib/purchaseEvent.js";

const router = Router();

router.get("/pricing-config", async (_req, res) => {
  try {
    const configs = await db.select().from(platformConfigTable);
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.chave] = c.valor;
    }

    const pricingMode = configMap["pricing_mode"] || "all_plans";

    let filteredProducts: any[] = [];

    const stripeClient = await getUncachableStripeClient();
    const stripeProducts = await stripeClient.products.list({ active: true, limit: 50 });
    for (const product of stripeProducts.data) {
      const prices = await stripeClient.prices.list({ product: product.id, active: true, limit: 20 });
      filteredProducts.push({
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
        prices: prices.data.map(p => ({
          id: p.id,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring,
          metadata: p.metadata,
        })),
      });
    }

    const VALID_TIERS = ["1_pro", "2_5_pro", "6_15_pro", "15_plus_pro"];

    if (pricingMode === "single_price") {
      filteredProducts = filteredProducts.filter((p: any) => p.metadata?.tier === "single");
    } else if (pricingMode === "hidden") {
      filteredProducts = [];
    } else {
      const glowUpiProducts = filteredProducts.filter((p: any) => {
        const tier = p.metadata?.tier;
        return tier && VALID_TIERS.includes(tier) && p.name?.startsWith("Glow Upi");
      });

      if (glowUpiProducts.length >= 4) {
        filteredProducts = glowUpiProducts;
      } else {
        const seenTiers = new Set<string>();
        filteredProducts = filteredProducts.filter((p: any) => {
          const tier = p.metadata?.tier;
          if (!tier || !VALID_TIERS.includes(tier)) return false;
          if (seenTiers.has(tier)) return false;
          seenTiers.add(tier);
          return true;
        });
      }
    }

    console.log(`[pricing-config] Returning ${filteredProducts.length} products, mode=${pricingMode}`);

    const publishableKey = await getStripePublishableKey();

    const freeTrialEnabled = configMap["free_trial_enabled"] !== "false";

    res.json({
      pricingMode,
      products: filteredProducts,
      publishableKey,
      freeTrialEnabled,
    });
  } catch (error: any) {
    console.error("Error fetching pricing config:", error);
    res.status(500).json({
      error: "Erro ao carregar configuração de preços. Tente novamente.",
      pricingMode: "all_plans",
      products: [],
      publishableKey: null,
      freeTrialEnabled: false,
    });
  }
});

router.post("/create-checkout-session", requireAuth, requireBarbearia, async (req: any, res) => {
  try {
    const { priceId, billingPeriod } = req.body;
    const barbearia = req.barbearia;

    if (!priceId) {
      return res.status(400).json({ error: "priceId is required" });
    }

    const configs = await db.select().from(platformConfigTable);
    const pricingMode = configs.find(c => c.chave === "pricing_mode")?.valor || "all_plans";
    if (pricingMode === "hidden") {
      return res.status(403).json({ error: "Assinaturas estão desativadas no momento" });
    }

    if (pricingMode === "single_price") {
      try {
        const allProducts = await stripeStorage.listProductsWithPrices(true, 50, 0);
        const allowedPriceIds = allProducts
          .filter((r: any) => r.product_metadata?.tier === "single")
          .map((r: any) => r.price_id);
        if (!allowedPriceIds.includes(priceId)) {
          return res.status(400).json({ error: "Este plano não está disponível no momento" });
        }
      } catch (_e) {
        const sc = await getUncachableStripeClient();
        const priceObj = await sc.prices.retrieve(priceId, { expand: ['product'] });
        const prod = priceObj.product as any;
        if (prod?.metadata?.tier !== "single") {
          return res.status(400).json({ error: "Este plano não está disponível no momento" });
        }
      }
    }

    let customerId = barbearia.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(
        barbearia.email || `salon-${barbearia.id}@glowup.com.br`,
        barbearia.nome,
        barbearia.id
      );
      customerId = customer.id;
      await db.update(barbeariasTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(barbeariasTable.id, barbearia.id));
    }

    let resolvedPeriod = billingPeriod || 'mensal';
    try {
      const allProducts = await stripeStorage.listProductsWithPrices(true, 50, 0);
      const priceRow = allProducts.find((r: any) => r.price_id === priceId);
      if (priceRow?.price_metadata?.period) {
        resolvedPeriod = priceRow.price_metadata.period;
      }
    } catch (_e) {
      const stripeClient = await getUncachableStripeClient();
      const price = await stripeClient.prices.retrieve(priceId);
      if (price.metadata?.period) {
        resolvedPeriod = price.metadata.period;
      }
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/checkout/cancel`,
      barbearia.id,
      resolvedPeriod
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout session error:", error);
    res.status(500).json({ error: "Erro ao criar sessão de pagamento. Tente novamente." });
  }
});

router.get("/subscription-status", requireAuth, requireBarbearia, async (req: any, res) => {
  try {
    const barbearia = req.barbearia;

    if (!barbearia.stripeSubscriptionId) {
      return res.json({
        status: barbearia.subscriptionStatus || "trial",
        subscription: null
      });
    }

    let subscription: any = null;
    try {
      subscription = await stripeStorage.getSubscription(barbearia.stripeSubscriptionId);
    } catch (_e) {
      const stripeClient = await getUncachableStripeClient();
      subscription = await stripeClient.subscriptions.retrieve(barbearia.stripeSubscriptionId);
    }
    res.json({
      status: barbearia.subscriptionStatus,
      subscription,
      plan: barbearia.subscriptionPlan,
      period: barbearia.subscriptionPeriod,
    });
  } catch (error: any) {
    console.error("Subscription status error:", error);
    res.json({ status: "trial", subscription: null });
  }
});

router.post("/create-portal-session", requireAuth, requireBarbearia, async (req: any, res) => {
  try {
    const barbearia = req.barbearia;

    if (!barbearia.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer found" });
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const session = await stripeService.createCustomerPortalSession(
      barbearia.stripeCustomerId,
      `${baseUrl}/empresa`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Portal session error:", error);
    res.status(500).json({ error: "Erro ao acessar portal de assinatura. Tente novamente." });
  }
});

router.post("/cancel-subscription", requireAuth, requireBarbearia, async (req: any, res) => {
  try {
    const barbearia = req.barbearia;
    const user = req.user;

    if (barbearia.donoId !== user.id) {
      return res.status(403).json({ error: "Apenas o dono pode cancelar a assinatura." });
    }

    if (!barbearia.stripeSubscriptionId) {
      return res.status(400).json({ error: "Nenhuma assinatura ativa encontrada." });
    }

    const stripeClient = await getUncachableStripeClient();
    const subscription = await stripeClient.subscriptions.update(barbearia.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : barbearia.planoVencimento;

    await db.update(barbeariasTable)
      .set({
        planoVencimento: periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(barbeariasTable.id, barbearia.id));

    console.log(`[cancel-subscription] barbeariaId=${barbearia.id} subscription=${barbearia.stripeSubscriptionId} cancel_at_period_end=true periodEnd=${periodEnd}`);

    res.json({
      success: true,
      cancelAtPeriodEnd: true,
      periodEnd: periodEnd?.toISOString(),
      message: "Assinatura cancelada. Você continuará com acesso até o final do período pago.",
    });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ error: "Erro ao cancelar assinatura. Tente novamente." });
  }
});

router.post("/create-direct-session", requireAuth, async (req: any, res) => {
  try {
    const { priceId, billingPeriod } = req.body;
    const user = req.user;
    console.log("[create-direct-session] userId:", user.id, "email:", user.email, "priceId:", priceId, "billingPeriod:", billingPeriod);

    if (!priceId) {
      return res.status(400).json({ error: "priceId is required" });
    }

    const configs = await db.select().from(platformConfigTable);
    const pricingMode = configs.find(c => c.chave === "pricing_mode")?.valor || "all_plans";
    if (pricingMode === "hidden") {
      return res.status(403).json({ error: "Assinaturas estão desativadas no momento" });
    }

    if (pricingMode === "single_price") {
      try {
        const allProductsCheck = await stripeStorage.listProductsWithPrices(true, 50, 0);
        const allowedPriceIds = allProductsCheck
          .filter((r: any) => r.product_metadata?.tier === "single")
          .map((r: any) => r.price_id);
        if (!allowedPriceIds.includes(priceId)) {
          return res.status(400).json({ error: "Este plano não está disponível no momento" });
        }
      } catch (_e) {
        const sc = await getUncachableStripeClient();
        const priceObj = await sc.prices.retrieve(priceId, { expand: ['product'] });
        const prod = priceObj.product as any;
        if (prod?.metadata?.tier !== "single") {
          return res.status(400).json({ error: "Este plano não está disponível no momento" });
        }
      }
    }

    const stripeClient = await getUncachableStripeClient();
    const customerEmail = user.email;
    let customerId: string;

    try {
      const customer = await stripeStorage.getCustomerByEmail(customerEmail);
      if (customer) {
        customerId = customer.id as string;
      } else {
        throw new Error("not found");
      }
    } catch (_e) {
      const existing = await stripeClient.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const newCustomer = await stripeClient.customers.create({
          email: customerEmail,
          name: user.nome,
          metadata: { userId: String(user.id), source: "pdvd" },
        });
        customerId = newCustomer.id;
      }
    }

    let resolvedPeriod = billingPeriod || 'mensal';
    try {
      const allProducts = await stripeStorage.listProductsWithPrices(true, 50, 0);
      const priceRow = allProducts.find((r: any) => r.price_id === priceId);
      if (priceRow?.price_metadata?.period) {
        resolvedPeriod = priceRow.price_metadata.period;
      }
    } catch (_e) {
      const price = await stripeClient.prices.retrieve(priceId);
      if (price.metadata?.period) {
        resolvedPeriod = price.metadata.period;
      }
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        userId: String(user.id),
        billingPeriod: resolvedPeriod,
        source: "pdvd",
      },
      subscription_data: {
        metadata: {
          userId: String(user.id),
          billingPeriod: resolvedPeriod,
          source: "pdvd",
        },
      },
      locale: 'auto',
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("Direct checkout session error:", error);
    res.status(500).json({ error: "Erro ao criar sessão de pagamento. Tente novamente." });
  }
});

router.post("/verify-direct-session", requireAuth, async (req: any, res) => {
  try {
    const { sessionId, eventId, fbp, fbc, fbclid } = req.body;
    const user = req.user;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const stripeClient = await getUncachableStripeClient();
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price.product'],
    });

    if (session.metadata?.userId !== String(user.id)) {
      return res.status(403).json({ error: "Sessão não pertence a este usuário" });
    }

    if (session.metadata?.source !== "pdvd") {
      return res.status(400).json({ error: "Sessão inválida para venda direta" });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: "Pagamento não confirmado", status: session.payment_status });
    }

    const subscription = session.subscription as any;
    const priceItem = subscription?.items?.data?.[0];
    const product = priceItem?.price?.product as any;
    const priceMeta = priceItem?.price?.metadata || {};
    const productMeta = product?.metadata || {};

    const amountTotal = session.amount_total ?? priceItem?.price?.unit_amount ?? null;
    const currencyCode = (session.currency || priceItem?.price?.currency || 'brl').toUpperCase();

    let stableEventId: string = eventId || purchaseEventId(session.id);
    try {
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
      const userAgent = (req.headers["user-agent"] as string) || null;
      const cookieFbp = req.cookies?._fbp || null;
      const cookieFbc = req.cookies?._fbc || null;
      const capiEvent = buildVerifyDirectSessionPurchaseEvent(session, {
        user: { id: user.id, email: user.email, telefone: (user as any).telefone },
        clientEventId: eventId,
        fbp,
        fbc,
        fbclid,
        cookieFbp,
        cookieFbc,
        ipAddress,
        userAgent,
      });
      stableEventId = capiEvent.eventId ?? stableEventId;
      sendCapiEvent(capiEvent).catch((e) => console.error("[verify-direct-session] capi error:", e));
    } catch (capiErr) {
      console.error("[verify-direct-session] capi dispatch error:", capiErr);
    }

    res.json({
      verified: true,
      customerId: session.customer as string,
      subscriptionId: subscription?.id,
      planTier: productMeta.tier || null,
      planPeriod: priceMeta.period || session.metadata?.billingPeriod || 'mensal',
      productName: product?.name || null,
      amountTotal,
      currency: currencyCode,
      priceId: priceItem?.price?.id || null,
      eventId: stableEventId,
    });
  } catch (error: any) {
    console.error("Verify direct session error:", error);
    res.status(500).json({ error: "Erro ao verificar sessão de pagamento." });
  }
});

router.post("/complete-direct-onboarding", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const {
      sessionId,
      nome,
      telefone,
      cep,
      logradouro,
      numero,
      bairro,
      cidade,
      uf,
      tipoEstabelecimento,
      comoSoube,
      utm,
    } = req.body;

    if (!sessionId || !nome || !telefone) {
      return res.status(400).json({ error: "sessionId, nome e telefone são obrigatórios" });
    }

    const [existingBarb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (existingBarb) {
      return res.json({ id: existingBarb.id, alreadyExists: true });
    }

    const stripeClient = await getUncachableStripeClient();
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price.product'],
    });

    if (session.metadata?.userId !== String(user.id)) {
      return res.status(403).json({ error: "Sessão não pertence a este usuário" });
    }

    if (session.metadata?.source !== "pdvd") {
      return res.status(400).json({ error: "Sessão inválida para venda direta" });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: "Pagamento não confirmado" });
    }

    const subscription = session.subscription as any;
    const priceItem = subscription?.items?.data?.[0];
    const product = priceItem?.price?.product as any;
    const priceMeta = priceItem?.price?.metadata || {};
    const productMeta = product?.metadata || {};

    const { slugify } = await import("../lib/slugify.js");
    let baseSlug = slugify(nome);
    const [existing2] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, baseSlug)).limit(1);
    if (existing2) {
      baseSlug = `${baseSlug}-${Date.now()}`;
    }

    let planoVencimento: Date | null = null;
    if (subscription?.current_period_end) {
      planoVencimento = new Date(subscription.current_period_end * 1000);
    }

    const [barbearia] = await db.insert(barbeariasTable).values({
      donoId: user.id,
      nome,
      slug: baseSlug,
      telefone: telefone || null,
      email: user.email || null,
      cep: cep || null,
      logradouro: logradouro || null,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf || null,
      onboardingStep: 5,
      planoVencimento,
      subscriptionStatus: "ativo",
      planoStatus: "ativo",
      planoNome: productMeta.tier || "pro",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription?.id || null,
      subscriptionPlan: productMeta.tier || null,
      subscriptionPeriod: priceMeta.period || session.metadata?.billingPeriod || 'mensal',
      segmentacao: tipoEstabelecimento || comoSoube ? { tipoEstabelecimento, comoSoube } : null,
      utmSource: utm?.utmSource || null,
      utmMedium: utm?.utmMedium || null,
      utmCampaign: utm?.utmCampaign || null,
      utmContent: utm?.utmContent || null,
      utmTerm: utm?.utmTerm || null,
      fbclid: utm?.fbclid || null,
      gclid: utm?.gclid || null,
      landingPage: utm?.landingPage || null,
      referrer: utm?.referrer || null,
    }).returning();

    try {
      const { PARAMETROS_DEFAULTS } = await import("./parametros.js");
      const { parametrosConfigTable } = await import("@workspace/db/schema");
      const paramRows = PARAMETROS_DEFAULTS.map((p: any) => ({
        barbeariaId: barbearia.id,
        chave: p.chave,
        valor: p.valorPadrao,
        tipo: p.tipo,
      }));
      await db.insert(parametrosConfigTable).values(paramRows);
    } catch (seedErr) {
      console.error("parametros seed error (non-fatal):", seedErr);
    }

    res.json({
      id: barbearia.id,
      nome: barbearia.nome,
      slug: barbearia.slug,
      subscriptionStatus: barbearia.subscriptionStatus,
    });
  } catch (error: any) {
    console.error("Complete direct onboarding error:", error);
    res.status(500).json({ error: "Erro ao finalizar cadastro. Tente novamente." });
  }
});

export default router;
