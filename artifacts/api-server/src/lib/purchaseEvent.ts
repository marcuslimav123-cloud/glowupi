import { purchaseEventId, type CapiEventInput } from "./fbCapi.js";

export interface VerifyDirectSessionContext {
  user: { id: number | string; email?: string | null; telefone?: string | null };
  clientEventId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  cookieFbp?: string | null;
  cookieFbc?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function buildVerifyDirectSessionPurchaseEvent(
  session: any,
  ctx: VerifyDirectSessionContext,
): CapiEventInput {
  const subscription = session?.subscription as any;
  const priceItem = subscription?.items?.data?.[0];
  const product = priceItem?.price?.product as any;

  const amountTotal = session?.amount_total ?? priceItem?.price?.unit_amount ?? null;
  const currencyCode = (session?.currency || priceItem?.price?.currency || "brl").toUpperCase();
  const eventId = ctx.clientEventId || purchaseEventId(session.id);

  return {
    eventName: "Purchase",
    eventId,
    actionSource: "website",
    userData: {
      email: ctx.user.email || null,
      phone: ctx.user.telefone || null,
      fbp: ctx.fbp || ctx.cookieFbp || null,
      fbc: ctx.fbc || ctx.cookieFbc || null,
      fbclid: ctx.fbclid || null,
      ipAddress: ctx.ipAddress || null,
      userAgent: ctx.userAgent || null,
      externalId: String(ctx.user.id),
    },
    customData: {
      value: typeof amountTotal === "number" ? amountTotal / 100 : undefined,
      currency: currencyCode,
      content_name: product?.name || undefined,
      content_ids: priceItem?.price?.id ? [priceItem.price.id] : undefined,
      content_type: "product",
    },
  };
}

export function buildWebhookPurchaseEvent(session: any): CapiEventInput | null {
  if (!session?.id) return null;
  if (session.payment_status !== "paid") return null;

  const subscription = session.subscription as any;
  const priceItem = subscription?.items?.data?.[0];
  const product = priceItem?.price?.product as any;
  const customer = session.customer as any;

  const amountTotal = session.amount_total ?? priceItem?.price?.unit_amount ?? null;
  const currencyCode = (session.currency || priceItem?.price?.currency || "brl").toUpperCase();

  const email =
    (typeof customer === "object" && customer?.email) ||
    session.customer_details?.email ||
    null;
  const phone =
    (typeof customer === "object" && customer?.phone) ||
    session.customer_details?.phone ||
    null;
  const externalId =
    session.metadata?.userId ||
    (typeof customer === "object" ? customer?.id : null) ||
    null;

  return {
    eventName: "Purchase",
    eventId: purchaseEventId(session.id),
    actionSource: "website",
    userData: {
      email,
      phone,
      externalId: externalId ? String(externalId) : null,
    },
    customData: {
      value: typeof amountTotal === "number" ? amountTotal / 100 : undefined,
      currency: currencyCode,
      content_name: product?.name || undefined,
      content_ids: priceItem?.price?.id ? [priceItem.price.id] : undefined,
      content_type: "product",
    },
  };
}
