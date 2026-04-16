import { apiUrl } from "./utils";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_KEYS = ["fbclid", "gclid"] as const;
const STORAGE_KEY = "glw_attribution";
const SESSION_KEY = "glw_session_id";

export interface AttributionData {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  capturedAt?: string;
}

export interface PublicTrackingConfig {
  fbPixelId: string | null;
  gaMeasurementId: string | null;
  tiktokPixelId: string | null;
}

let cachedConfig: PublicTrackingConfig | null = null;
let pixelInstalled = false;

function genId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = genId();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export function captureAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming: AttributionData = {};
    let hasNew = false;
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) {
        (incoming as any)[toCamel(k)] = v;
        hasNew = true;
      }
    }
    for (const k of CLICK_KEYS) {
      const v = params.get(k);
      if (v) {
        (incoming as any)[k] = v;
        hasNew = true;
      }
    }

    const existing = getStoredAttribution();
    if (hasNew) {
      incoming.referrer = document.referrer || existing?.referrer || null;
      incoming.landingPage = window.location.pathname + window.location.search;
      incoming.capturedAt = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
      } catch {}
      return incoming;
    }

    if (existing) return existing;

    const fallback: AttributionData = {
      referrer: document.referrer || null,
      landingPage: window.location.pathname,
      capturedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    } catch {}
    return fallback;
  } catch {
    return {};
  }
}

export function getStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toCamel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export async function loadTrackingConfig(): Promise<PublicTrackingConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch(apiUrl("/campaign/public-config"));
    if (res.ok) {
      cachedConfig = await res.json();
      return cachedConfig!;
    }
  } catch {}
  cachedConfig = { fbPixelId: null, gaMeasurementId: null, tiktokPixelId: null };
  return cachedConfig;
}

export function installFacebookPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  if (pixelInstalled) return;
  if (!pixelId || pixelId === "PIXEL_ID_AQUI") return;
  pixelInstalled = true;
  const script = document.createElement("script");
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);
}

export function fbq(...args: any[]) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    try {
      (window as any).fbq(...args);
    } catch {}
  }
}

interface TrackOptions {
  pagePath?: string;
  valueCents?: number;
  currency?: string;
  fbEvent?: string;
  fbParams?: Record<string, any>;
}

async function sendServerEvent(tipo: string, opts: TrackOptions = {}) {
  const attr = getStoredAttribution() || captureAttribution();
  try {
    await fetch(apiUrl("/campaign/track"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        sessionId: getSessionId(),
        utmSource: attr.utmSource || null,
        utmMedium: attr.utmMedium || null,
        utmCampaign: attr.utmCampaign || null,
        utmContent: attr.utmContent || null,
        utmTerm: attr.utmTerm || null,
        fbclid: attr.fbclid || null,
        gclid: attr.gclid || null,
        referrer: attr.referrer || null,
        landingPage: attr.landingPage || null,
        pagePath: opts.pagePath || (typeof window !== "undefined" ? window.location.pathname : null),
        valueCents: opts.valueCents,
        currency: opts.currency,
      }),
      keepalive: true,
    });
  } catch {}
}

export function trackPageView(opts: TrackOptions = {}) {
  fbq("track", opts.fbEvent || "PageView", opts.fbParams);
  sendServerEvent("pageview", opts);
}

export function trackLead(opts: TrackOptions = {}) {
  fbq("track", opts.fbEvent || "Lead", opts.fbParams);
  sendServerEvent("lead", opts);
}

export function trackInitiateCheckout(opts: TrackOptions = {}) {
  const params = { ...(opts.fbParams || {}) };
  if (opts.valueCents) params.value = opts.valueCents / 100;
  if (opts.currency) params.currency = opts.currency;
  fbq("track", opts.fbEvent || "InitiateCheckout", params);
  sendServerEvent("checkout", opts);
}

export function trackPurchase(opts: TrackOptions = {}) {
  const params = { ...(opts.fbParams || {}) };
  if (opts.valueCents) params.value = opts.valueCents / 100;
  if (opts.currency) params.currency = opts.currency;
  fbq("track", opts.fbEvent || "Purchase", params);
  sendServerEvent("purchase", opts);
}

export async function initTracking() {
  if (typeof window === "undefined") return;
  captureAttribution();
  getSessionId();
  const cfg = await loadTrackingConfig();
  if (cfg.fbPixelId) {
    installFacebookPixel(cfg.fbPixelId);
    fbq("track", "PageView");
  }
}

export function getAttributionForCheckout() {
  const a = getStoredAttribution();
  if (!a) return null;
  return {
    utmSource: a.utmSource || null,
    utmMedium: a.utmMedium || null,
    utmCampaign: a.utmCampaign || null,
    utmContent: a.utmContent || null,
    utmTerm: a.utmTerm || null,
    fbclid: a.fbclid || null,
    gclid: a.gclid || null,
    referrer: a.referrer || null,
    landingPage: a.landingPage || null,
  };
}
