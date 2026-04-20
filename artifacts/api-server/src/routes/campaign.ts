import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { campaignEventsTable, barbeariasTable, platformConfigTable } from "@workspace/db/schema";
import { sql, desc, and, gte, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/adminAuth.js";
import { sendCapiEvent, tipoToFbEventName } from "../lib/fbCapi.js";

const router: IRouter = Router();

const VALID_TYPES = new Set(["pageview", "lead", "checkout", "purchase"]);

router.get("/public-config", async (_req, res) => {
  try {
    const configs = await db
      .select()
      .from(platformConfigTable)
      .where(sql`${platformConfigTable.chave} IN ('fb_pixel_id', 'ga_measurement_id', 'tiktok_pixel_id')`);
    const map: Record<string, string> = {};
    for (const c of configs) map[c.chave] = c.valor;
    res.json({
      fbPixelId: map["fb_pixel_id"] || null,
      gaMeasurementId: map["ga_measurement_id"] || null,
      tiktokPixelId: map["tiktok_pixel_id"] || null,
    });
  } catch {
    res.json({ fbPixelId: null, gaMeasurementId: null, tiktokPixelId: null });
  }
});

router.post("/track", async (req, res) => {
  try {
    const {
      tipo,
      sessionId,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      fbclid,
      gclid,
      referrer,
      landingPage,
      pagePath,
      valueCents,
      currency,
      eventId,
      email,
      phone,
      fbp,
      fbc,
      fbContentName,
      fbContentIds,
      eventSourceUrl,
      skipCapi,
    } = req.body || {};

    if (!tipo || !VALID_TYPES.has(String(tipo))) {
      return res.status(400).json({ error: "tipo inválido" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
    const userAgent = (req.headers["user-agent"] as string) || null;

    const truncate = (v: any, n = 500) => (typeof v === "string" ? v.slice(0, n) : null);

    await db.insert(campaignEventsTable).values({
      tipo,
      sessionId: truncate(sessionId, 100),
      utmSource: truncate(utmSource, 100),
      utmMedium: truncate(utmMedium, 100),
      utmCampaign: truncate(utmCampaign, 200),
      utmContent: truncate(utmContent, 200),
      utmTerm: truncate(utmTerm, 200),
      fbclid: truncate(fbclid, 200),
      gclid: truncate(gclid, 200),
      referrer: truncate(referrer, 500),
      landingPage: truncate(landingPage, 500),
      pagePath: truncate(pagePath, 200),
      valueCents: typeof valueCents === "number" ? Math.round(valueCents) : null,
      currency: truncate(currency, 10),
      ipAddress: truncate(ipAddress, 100),
      userAgent: truncate(userAgent, 500),
    });

    const fbEventName = tipoToFbEventName(String(tipo));
    if (fbEventName && !skipCapi) {
      const cookieFbp = (req as any).cookies?._fbp || null;
      const cookieFbc = (req as any).cookies?._fbc || null;
      const customData: Record<string, any> = {};
      if (typeof valueCents === "number" && valueCents > 0) {
        customData.value = Math.round(valueCents) / 100;
        customData.currency = (currency || "BRL").toString().toUpperCase();
      }
      if (fbContentName) customData.content_name = String(fbContentName).slice(0, 200);
      if (Array.isArray(fbContentIds) && fbContentIds.length) {
        customData.content_ids = fbContentIds.map((x) => String(x)).slice(0, 20);
        customData.content_type = "product";
      }
      sendCapiEvent({
        eventName: fbEventName,
        eventId: eventId ? String(eventId).slice(0, 200) : null,
        eventSourceUrl: typeof eventSourceUrl === "string" ? eventSourceUrl.slice(0, 500) : null,
        actionSource: "website",
        userData: {
          email: email || null,
          phone: phone || null,
          fbp: fbp || cookieFbp || null,
          fbc: fbc || cookieFbc || null,
          fbclid: fbclid || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          externalId: sessionId || null,
        },
        customData: Object.keys(customData).length ? customData : undefined,
      }).catch((e) => console.error("[campaign/track] capi error:", e));
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[campaign/track] error:", e);
    res.status(500).json({ error: "erro" });
  }
});

router.get("/metrics", requireAdmin, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days as string) || 30, 365));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await db
      .select({
        tipo: campaignEventsTable.tipo,
        utmSource: campaignEventsTable.utmSource,
        utmCampaign: campaignEventsTable.utmCampaign,
        utmMedium: campaignEventsTable.utmMedium,
        sessionId: campaignEventsTable.sessionId,
        valueCents: campaignEventsTable.valueCents,
        createdAt: campaignEventsTable.createdAt,
      })
      .from(campaignEventsTable)
      .where(gte(campaignEventsTable.createdAt, since))
      .orderBy(desc(campaignEventsTable.createdAt));

    const totals = { pageview: 0, lead: 0, checkout: 0, purchase: 0 };
    const uniqueByType: Record<string, Set<string>> = { pageview: new Set(), lead: new Set(), checkout: new Set(), purchase: new Set() };
    let revenueCents = 0;

    type SourceAgg = { pageview: number; lead: number; checkout: number; purchase: number; revenueCents: number };
    const bySource: Record<string, SourceAgg> = {};
    const byCampaign: Record<string, SourceAgg> = {};
    const ensure = (m: Record<string, SourceAgg>, k: string): SourceAgg => {
      if (!m[k]) m[k] = { pageview: 0, lead: 0, checkout: 0, purchase: 0, revenueCents: 0 };
      return m[k];
    };

    const dailyMap: Record<string, { pageview: number; lead: number; checkout: number; purchase: number }> = {};

    for (const e of events) {
      const t = e.tipo as keyof typeof totals;
      if (totals[t] !== undefined) totals[t]++;
      if (e.sessionId && uniqueByType[t]) uniqueByType[t].add(e.sessionId);

      const src = e.utmSource || "(direto)";
      const camp = e.utmCampaign || "(sem campanha)";
      const sAgg = ensure(bySource, src);
      const cAgg = ensure(byCampaign, camp);
      sAgg[t]++;
      cAgg[t]++;
      if (t === "purchase" && e.valueCents) {
        sAgg.revenueCents += e.valueCents;
        cAgg.revenueCents += e.valueCents;
        revenueCents += e.valueCents;
      }

      const day = e.createdAt!.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { pageview: 0, lead: 0, checkout: 0, purchase: 0 };
      dailyMap[day][t]++;
    }

    const uniqueTotals = {
      pageview: uniqueByType.pageview.size,
      lead: uniqueByType.lead.size,
      checkout: uniqueByType.checkout.size,
      purchase: uniqueByType.purchase.size,
    };

    const conversion = {
      pageviewToLead: uniqueTotals.pageview > 0 ? Math.round((uniqueTotals.lead / uniqueTotals.pageview) * 10000) / 100 : 0,
      leadToCheckout: uniqueTotals.lead > 0 ? Math.round((uniqueTotals.checkout / uniqueTotals.lead) * 10000) / 100 : 0,
      checkoutToPurchase: uniqueTotals.checkout > 0 ? Math.round((uniqueTotals.purchase / uniqueTotals.checkout) * 10000) / 100 : 0,
      pageviewToPurchase: uniqueTotals.pageview > 0 ? Math.round((uniqueTotals.purchase / uniqueTotals.pageview) * 10000) / 100 : 0,
    };

    const tenants = await db
      .select({
        id: barbeariasTable.id,
        nome: barbeariasTable.nome,
        utmSource: barbeariasTable.utmSource,
        utmCampaign: barbeariasTable.utmCampaign,
        utmMedium: barbeariasTable.utmMedium,
        subscriptionStatus: barbeariasTable.subscriptionStatus,
        subscriptionPlan: barbeariasTable.subscriptionPlan,
        createdAt: barbeariasTable.createdAt,
      })
      .from(barbeariasTable)
      .where(gte(barbeariasTable.createdAt, since))
      .orderBy(desc(barbeariasTable.createdAt));

    const tenantsBySource: Record<string, { total: number; ativos: number; trial: number }> = {};
    for (const t of tenants) {
      const src = t.utmSource || "(direto)";
      if (!tenantsBySource[src]) tenantsBySource[src] = { total: 0, ativos: 0, trial: 0 };
      tenantsBySource[src].total++;
      const status = t.subscriptionStatus || "trial";
      if (status === "active" || status === "ativo") tenantsBySource[src].ativos++;
      else if (status === "trial") tenantsBySource[src].trial++;
    }

    const sortedSources = Object.entries(bySource)
      .map(([source, agg]) => ({ source, ...agg, revenue: agg.revenueCents / 100 }))
      .sort((a, b) => (b.purchase - a.purchase) || (b.lead - a.lead) || (b.pageview - a.pageview))
      .slice(0, 20);

    const sortedCampaigns = Object.entries(byCampaign)
      .map(([campaign, agg]) => ({ campaign, ...agg, revenue: agg.revenueCents / 100 }))
      .sort((a, b) => (b.purchase - a.purchase) || (b.lead - a.lead))
      .slice(0, 20);

    const dailySeries = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, ...v }));

    res.json({
      days,
      since: since.toISOString(),
      totals,
      uniqueTotals,
      conversion,
      revenue: revenueCents / 100,
      bySource: sortedSources,
      byCampaign: sortedCampaigns,
      daily: dailySeries,
      tenantsBySource: Object.entries(tenantsBySource)
        .map(([source, v]) => ({ source, ...v }))
        .sort((a, b) => b.total - a.total),
      tenantsRecent: tenants.slice(0, 25).map(t => ({
        ...t,
        createdAt: t.createdAt?.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[campaign/metrics] error:", e);
    res.status(500).json({ error: "erro ao carregar métricas" });
  }
});

export default router;
