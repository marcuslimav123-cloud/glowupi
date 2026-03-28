import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { barbeariasTable, platformConfigTable, usersTable, parametrosConfigTable } from "@workspace/db/schema";
import { stripeService } from "../stripeService.js";
import { stripeStorage } from "../stripeStorage.js";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient.js";
import { requireAuth, requireBarbearia, createSession } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";
import { slugify } from "../lib/slugify.js";
import { PARAMETROS_DEFAULTS } from "./parametros.js";

const router = Router();

router.get("/pricing-config", async (_req, res) => {
  try {
    const configs = await db.select().from(platformConfigTable);
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.chave] = c.valor;
    }

    const pricingMode = configMap["pricing_mode"] || "all_plans";

    const productsWithPrices = await stripeStorage.listProductsWithPrices(true, 50, 0);

    const productsMap = new Map<string, any>();
    for (const row of productsWithPrices) {
      const pid = row.product_id as string;
      if (!productsMap.has(pid)) {
        productsMap.set(pid, {
          id: pid,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata,
          prices: []
        });
      }
      if (row.price_id) {
        productsMap.get(pid).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
          metadata: row.price_metadata,
        });
      }
    }

    const publishableKey = await getStripePublishableKey();

    let filteredProducts = Array.from(productsMap.values());
    if (pricingMode === "single_price") {
      filteredProducts = filteredProducts.filter((p: any) => p.metadata?.tier === "single");
    } else if (pricingMode === "hidden") {
      filteredProducts = [];
    }

    const freeTrialEnabled = configMap["free_trial_enabled"] !== "false";

    res.json({
      pricingMode,
      products: filteredProducts,
      publishableKey,
      freeTrialEnabled,
    });
  } catch (error: any) {
    console.error("Error fetching pricing config:", error);
    res.json({
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
      const allProducts = await stripeStorage.listProductsWithPrices(true, 50, 0);
      const allowedPriceIds = allProducts
        .filter((r: any) => r.product_metadata?.tier === "single")
        .map((r: any) => r.price_id);
      if (!allowedPriceIds.includes(priceId)) {
        return res.status(400).json({ error: "Este plano não está disponível no momento" });
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
    const allProducts = await stripeStorage.listProductsWithPrices(true, 50, 0);
    const priceRow = allProducts.find((r: any) => r.price_id === priceId);
    if (priceRow?.price_metadata?.period) {
      resolvedPeriod = priceRow.price_metadata.period;
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
    res.status(500).json({ error: error.message });
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

    const subscription = await stripeStorage.getSubscription(barbearia.stripeSubscriptionId);
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
    res.status(500).json({ error: error.message });
  }
});

router.post("/google-checkout", async (req, res) => {
  try {
    const { credential, priceId, billingPeriod } = req.body;
    if (!credential || !priceId) {
      return res.status(400).json({ error: "credential e priceId são obrigatórios" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Login com Google não configurado" });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: "Token Google inválido" });
    if (!payload.email_verified) return res.status(400).json({ error: "E-mail do Google não verificado" });

    const googleId = payload.sub;
    const email = payload.email;
    const nome = payload.name || email.split("@")[0];
    const fotoUrl = payload.picture || null;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (user) {
      if (!user.googleId) {
        [user] = await db.update(usersTable).set({ googleId, fotoUrl: fotoUrl || user.fotoUrl }).where(eq(usersTable.id, user.id)).returning();
      }
    } else {
      [user] = await db.insert(usersTable).values({
        nome,
        email,
        googleId,
        fotoUrl,
        role: "dono",
      }).returning();
    }

    const token = createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });

    let [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);

    if (!barbearia) {
      let baseSlug = slugify(nome);
      const [existingSlug] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, baseSlug)).limit(1);
      if (existingSlug) baseSlug = `${baseSlug}-${Date.now()}`;

      [barbearia] = await db.insert(barbeariasTable).values({
        donoId: user.id,
        nome: `${nome}`,
        slug: baseSlug,
        telefone: null,
        email: email,
        onboardingStep: 0,
        subscriptionStatus: "pendente",
        planoVencimento: new Date(),
      }).returning();

      try {
        const paramRows = PARAMETROS_DEFAULTS.map(p => ({
          barbeariaId: barbearia.id,
          chave: p.chave,
          valor: p.valorPadrao,
          tipo: p.tipo,
        }));
        await db.insert(parametrosConfigTable).values(paramRows);
      } catch (seedErr) {
        console.error("parametros seed error (non-fatal):", seedErr);
      }
    }

    const configs = await db.select().from(platformConfigTable);
    const pricingMode = configs.find(c => c.chave === "pricing_mode")?.valor || "all_plans";
    if (pricingMode === "hidden") {
      return res.status(403).json({ error: "Assinaturas estão desativadas no momento" });
    }

    let customerId = barbearia.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(
        barbearia.email || email,
        barbearia.nome,
        barbearia.id
      );
      customerId = customer.id;
      await db.update(barbeariasTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(barbeariasTable.id, barbearia.id));
    }

    let resolvedPeriod = billingPeriod || "mensal";
    const allProducts = await stripeStorage.listProductsWithPrices(true, 50, 0);
    const priceRow = allProducts.find((r: any) => r.price_id === priceId);
    if (priceRow?.price_metadata?.period) {
      resolvedPeriod = priceRow.price_metadata.period;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

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
    console.error("Google checkout error:", error);
    res.status(500).json({ error: error.message || "Erro ao processar checkout" });
  }
});

export default router;
