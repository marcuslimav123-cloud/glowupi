import { getStripeSync } from './stripeClient.js';
import { getUncachableStripeClient } from './stripeClient.js';
import { eq } from 'drizzle-orm';
import { db } from '@workspace/db';
import { barbeariasTable } from '@workspace/db/schema';

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

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const priceMetadata = subscription.items?.data?.[0]?.price?.metadata;
  const planTier = priceMetadata?.tier || null;
  const planPeriod = priceMetadata?.period || null;

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await db.update(barbeariasTable)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus,
      subscriptionPlan: planTier,
      subscriptionPeriod: planPeriod,
      planoStatus: subscriptionStatus === 'ativo' ? 'ativo' : subscriptionStatus,
      planoNome: planTier || barbearia.planoNome,
      planoVencimento: periodEnd || barbearia.planoVencimento,
      updatedAt: new Date(),
    })
    .where(eq(barbeariasTable.id, barbearia.id));

  console.log(`Updated barbearia ${barbearia.id} subscription: status=${subscriptionStatus}, plan=${planTier}, period=${planPeriod}`);
}

async function handleCheckoutCompleted(session: any) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  if (!customerId) return;

  const [barbearia] = await db
    .select()
    .from(barbeariasTable)
    .where(eq(barbeariasTable.stripeCustomerId, customerId))
    .limit(1);

  if (!barbearia) return;

  if (subscriptionId) {
    try {
      const stripe = await getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await handleSubscriptionEvent(subscription);
    } catch (err: any) {
      console.error('Error fetching subscription from checkout, keeping pendente:', err.message);
    }
  } else {
    console.warn(`Checkout session completed without subscriptionId for barbearia ${barbearia.id}, keeping pendente`);
  }

  console.log(`Checkout completed for barbearia ${barbearia.id}`);
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
        await handleCheckoutCompleted(event.data.object);
      }
    } catch (err: any) {
      console.error('Error handling subscription webhook event:', err.message);
    }
  }
}
