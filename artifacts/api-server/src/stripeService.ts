import { stripeStorage } from './stripeStorage.js';
import { getUncachableStripeClient } from './stripeClient.js';

export class StripeService {
  async createCustomer(email: string, name: string, barbeariaId: number) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
      metadata: { barbeariaId: String(barbeariaId) },
    });
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    barbeariaId: number,
    billingPeriod?: string
  ) {
    const stripe = await getUncachableStripeClient();

    const sessionParams: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { barbeariaId: String(barbeariaId), billingPeriod: billingPeriod || 'mensal' },
      locale: 'pt-BR' as any,
    };

    if (billingPeriod === 'mensal') {
      sessionParams.subscription_data = {
        trial_period_days: 1,
        metadata: { barbeariaId: String(barbeariaId), billingPeriod: 'mensal' },
      };
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    return await stripeStorage.getProduct(productId);
  }

  async getSubscription(subscriptionId: string) {
    return await stripeStorage.getSubscription(subscriptionId);
  }
}

export const stripeService = new StripeService();
