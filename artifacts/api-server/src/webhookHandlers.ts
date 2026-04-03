import { getStripeSync } from './stripeClient.js';
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
