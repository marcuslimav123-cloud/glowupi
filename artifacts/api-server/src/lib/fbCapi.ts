import crypto from "node:crypto";
import { db } from "@workspace/db";
import { platformConfigTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const GRAPH_VERSION = "v18.0";

let cachedPixelId: { value: string | null; ts: number } | null = null;
const PIXEL_CACHE_MS = 60_000;

async function getPixelId(): Promise<string | null> {
  if (cachedPixelId && Date.now() - cachedPixelId.ts < PIXEL_CACHE_MS) {
    return cachedPixelId.value;
  }
  try {
    const rows = await db
      .select()
      .from(platformConfigTable)
      .where(sql`${platformConfigTable.chave} = 'fb_pixel_id'`);
    const value = rows[0]?.valor || null;
    cachedPixelId = { value: value && value !== "PIXEL_ID_AQUI" ? value : null, ts: Date.now() };
    return cachedPixelId.value;
  } catch {
    cachedPixelId = { value: null, ts: Date.now() };
    return null;
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export interface CapiUserData {
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  externalId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  [key: string]: any;
}

export interface CapiEventInput {
  eventName: "PageView" | "Lead" | "InitiateCheckout" | "Purchase" | string;
  eventId?: string | null;
  eventTime?: number;
  eventSourceUrl?: string | null;
  actionSource?: "website" | "system_generated" | "email" | "phone_call" | "chat" | "physical_store" | "other_app";
  userData: CapiUserData;
  customData?: CapiCustomData;
}

function buildFbc(fbc: string | null | undefined, fbclid: string | null | undefined): string | undefined {
  if (fbc) return fbc;
  if (fbclid) {
    return `fb.1.${Date.now()}.${fbclid}`;
  }
  return undefined;
}

export async function sendCapiEvent(event: CapiEventInput): Promise<{ ok: boolean; status?: number; error?: string }> {
  const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "FB_CAPI_ACCESS_TOKEN not set" };
  }
  const pixelId = await getPixelId();
  if (!pixelId) {
    return { ok: false, error: "fb_pixel_id not configured" };
  }

  const u = event.userData;
  const userData: Record<string, any> = {};
  if (u.email) userData.em = [sha256(normalizeEmail(u.email))];
  if (u.phone) {
    const p = normalizePhone(u.phone);
    if (p) userData.ph = [sha256(p)];
  }
  if (u.firstName) userData.fn = [sha256(u.firstName.trim().toLowerCase())];
  if (u.lastName) userData.ln = [sha256(u.lastName.trim().toLowerCase())];
  if (u.city) userData.ct = [sha256(u.city.trim().toLowerCase().replace(/\s+/g, ""))];
  if (u.state) userData.st = [sha256(u.state.trim().toLowerCase())];
  if (u.zip) userData.zp = [sha256(u.zip.trim().toLowerCase().replace(/\s+/g, ""))];
  if (u.country) userData.country = [sha256(u.country.trim().toLowerCase())];
  if (u.externalId) userData.external_id = [sha256(String(u.externalId))];
  if (u.ipAddress) userData.client_ip_address = u.ipAddress;
  if (u.userAgent) userData.client_user_agent = u.userAgent;
  if (u.fbp) userData.fbp = u.fbp;
  const fbc = buildFbc(u.fbc, u.fbclid);
  if (fbc) userData.fbc = fbc;

  const eventTime = event.eventTime ?? Math.floor(Date.now() / 1000);

  const payload: any = {
    data: [
      {
        event_name: event.eventName,
        event_time: eventTime,
        event_id: event.eventId || crypto.randomUUID(),
        action_source: event.actionSource || "website",
        ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
        user_data: userData,
        ...(event.customData ? { custom_data: event.customData } : {}),
      },
    ],
  };

  const testCode = process.env.FB_CAPI_TEST_EVENT_CODE;
  if (testCode) payload.test_event_code = testCode;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[fbCapi] ${event.eventName} failed status=${res.status} body=${text.slice(0, 500)}`);
      return { ok: false, status: res.status, error: text.slice(0, 200) };
    }
    return { ok: true, status: res.status };
  } catch (err: any) {
    console.error(`[fbCapi] ${event.eventName} error:`, err?.message || err);
    return { ok: false, error: err?.message || "network" };
  }
}

export function tipoToFbEventName(tipo: string): string | null {
  switch (tipo) {
    case "pageview":
      return "PageView";
    case "lead":
      return "Lead";
    case "checkout":
      return "InitiateCheckout";
    case "purchase":
      return "Purchase";
    default:
      return null;
  }
}
