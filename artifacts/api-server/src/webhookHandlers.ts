import { getStripeSync, getUncachableStripeClient } from './stripeClient.js';
import { eq } from 'drizzle-orm';
import { db } from '@workspace/db';
import { barbeariasTable } from '@workspace/db/schema';
import { sendCapiEvent } from './lib/fbCapi.js';
import { buildWebhookPurchaseEvent } from './lib/purchaseEvent.js';

async function handleCheckoutSessionCompleted(sessionObj: any) {
  try {
    const sessionId = sessionObj?.id;
    if (!sessionId) return;

    const source = sessionObj?.metadata?.source;
    if (source !== 'pdvd') {
      return;
    }

    const stripeClient = await getUncachableStripeClient();
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price.product', 'customer'],
    });

    if (session.payment_status !== 'paid') {
      console.log(`[webhook:purchase] skip session=${sessionId} payment_status=${session.payment_status}`);
      return;
    }

    const event = buildWebhookPurchaseEvent(session);
    if (!event) return;

    const result = await sendCapiEvent(event);

    console.log(`[webhook:purchase] session=${sessionId} eventId=${event.eventId} ok=${result.ok} status=${result.status ?? ''} err=${result.error ?? ''}`);
  } catch (err: any) {
    console.error('[webhook:purchase] error:', err?.message || err);
  }
}

async function handleCheckoutSessionExpired(sessionObj: any) {
  try {
    const sessionId = sessionObj?.id;
    if (!sessionId) return;

    const source = sessionObj?.metadata?.source;
    if (source !== 'pdvd') {
      return;
    }

    const stripeClient = await getUncachableStripeClient();
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product', 'customer'],
    });

    if (session.payment_status === 'paid') {
      console.log(`[webhook:abandoned] skip session=${sessionId} payment_status=paid`);
      return;
    }

    const lineItem = (session as any).line_items?.data?.[0];
    const price = lineItem?.price;
    const product = price?.product as any;
    const customer = session.customer as any;

    const amountTotal = session.amount_total ?? price?.unit_amount ?? null;
    const currencyCode = (session.currency || price?.currency || 'brl').toUpperCase();
    const stableEventId = `abandoned_${session.id}`;

    const email = (typeof customer === 'object' && customer?.email)
      || session.customer_details?.email
      || null;
    const phone = (typeof customer === 'object' && customer?.phone)
      || session.customer_details?.phone
      || null;
    const externalId = session.metadata?.userId || (typeof customer === 'object' ? customer?.id : null) || null;

    const result = await sendCapiEvent({
      eventName: 'CheckoutAbandoned',
      eventId: stableEventId,
      actionSource: 'website',
      userData: {
        email,
        phone,
        externalId: externalId ? String(externalId) : null,
      },
      customData: {
        value: typeof amountTotal === 'number' ? amountTotal / 100 : undefined,
        currency: currencyCode,
        content_name: product?.name || undefined,
        content_ids: price?.id ? [price.id] : undefined,
        content_type: 'product',
      },
    });

    console.log(`[webhook:abandoned] session=${sessionId} eventId=${stableEventId} ok=${result.ok} status=${result.status ?? ''} err=${result.error ?? ''}`);
  } catch (err: any) {
    console.error('[webhook:abandoned] error:', err?.message || err);
  }
}

async function handleSubscriptionEvent(subscription: any) {
  const customerId = subscription.customer;
  if (!customerId) return;

  const [barbearia] = await db
    .select()
    .from(barbeariasTable)
    .where(eq(barbeariasTable.stripeCustomerId, customerId))
    .limit(1);

  if (!barbearia) return;

  const status = subscription.status;
  let subscriptionStatus = 'trial';
  if (status === 'active') subscriptionStatus = 'ativo';
  else if (status === 'past_due') subscriptionStatus = 'inadimplente';
  else if (status === 'canceled' || status === 'unpaid') subscriptionStatus = 'cancelado';
  else if (status === 'trialing') subscriptionStatus = 'trial';
  else subscriptionStatus = status;

  const priceMetadata = subscription.items?.data?.[0]?.price?.metadata;
  const planTier = priceMetadata?.tier || null;
  const planPeriod = priceMetadata?.period || null;

  let planoVencimento: Date | null = barbearia.planoVencimento;
  if (subscriptionStatus === 'ativo' || subscriptionStatus === 'trial') {
    const currentPeriodEnd = subscription.current_period_end;
    if (currentPeriodEnd) {
      planoVencimento = new Date(currentPeriodEnd * 1000);
    }
  } else if (subscriptionStatus === 'inadimplente') {
    const currentPeriodEnd = subscription.current_period_end;
    if (currentPeriodEnd) {
      const gracePeriodEnd = new Date(currentPeriodEnd * 1000);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
      planoVencimento = gracePeriodEnd;
    }
  } else if (subscriptionStatus === 'cancelado') {
    planoVencimento = barbearia.planoVencimento;
  }

  const updates: any = {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus,
    subscriptionPlan: planTier || barbearia.subscriptionPlan,
    subscriptionPeriod: planPeriod || barbearia.subscriptionPeriod,
    planoStatus: subscriptionStatus === 'ativo' ? 'ativo' : subscriptionStatus,
    planoNome: planTier || barbearia.planoNome,
    planoVencimento,
    updatedAt: new Date(),
  };

  if (subscriptionStatus === 'ativo') {
    updates.ativo = true;
  }

  await db.update(barbeariasTable)
    .set(updates)
    .where(eq(barbeariasTable.id, barbearia.id));

  console.log(`Updated barbearia ${barbearia.id} subscription: status=${subscriptionStatus}, plan=${planTier}, period=${planPeriod}, vencimento=${planoVencimento?.toISOString()}`);
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString());
      const eventType = event.type;

      if (
        eventType === 'customer.subscription.created' ||
        eventType === 'customer.subscription.updated' ||
        eventType === 'customer.subscription.deleted'
      ) {
        await handleSubscriptionEvent(event.data.object);
      }

      if (eventType === 'checkout.session.completed') {
        await handleCheckoutSessionCompleted(event.data.object);
      }

      if (eventType === 'checkout.session.expired') {
        await handleCheckoutSessionExpired(event.data.object);
      }

      if (eventType === 'invoice.payment_failed') {
        const invoice = event.data.object;
        const custId = invoice.customer;
        if (custId) {
          const [barb] = await db.select().from(barbeariasTable)
            .where(eq(barbeariasTable.stripeCustomerId, custId)).limit(1);
          if (barb) {
            console.log(`[webhook] Payment failed for barbearia ${barb.id} (${barb.nome}). Stripe will retry automatically.`);
          }
        }
      }
    } catch (err: any) {
      console.error('Error handling subscription webhook event:', err.message);
    }
  }
}
