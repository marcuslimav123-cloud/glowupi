import { getUncachableStripeClient } from './stripeClient';

const PLANS = [
  {
    name: 'Glow Upi - 1 Profissional',
    description: 'Plano para salões com 1 profissional',
    metadata: { tier: '1_pro', professionals: '1' },
    prices: {
      mensal: 7990,
      semestral: 6780,
      anual: 5590,
    }
  },
  {
    name: 'Glow Upi - 2 a 5 Profissionais',
    description: 'Plano para salões com 2 a 5 profissionais',
    metadata: { tier: '2_5_pro', professionals: '2-5' },
    prices: {
      mensal: 10990,
      semestral: 9330,
      anual: 7690,
    }
  },
  {
    name: 'Glow Upi - 6 a 15 Profissionais',
    description: 'Plano para salões com 6 a 15 profissionais',
    metadata: { tier: '6_15_pro', professionals: '6-15' },
    prices: {
      mensal: 16450,
      semestral: 13980,
      anual: 11515,
    }
  },
  {
    name: 'Glow Upi - +15 Profissionais',
    description: 'Plano para salões com mais de 15 profissionais',
    metadata: { tier: '15_plus_pro', professionals: '+15' },
    prices: {
      mensal: 21990,
      semestral: 18680,
      anual: 15390,
    }
  },
];

const SINGLE_PRICE_PLAN = {
  name: 'Glow Upi - Plano Único',
  description: 'Plano único com todas as funcionalidades',
  metadata: { tier: 'single', professionals: 'unlimited' },
  price: 9700,
};

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Creating Glow Upi products and prices in Stripe...\n');

    for (const plan of PLANS) {
      const existing = await stripe.products.search({
        query: `name:'${plan.name}' AND active:'true'`
      });

      if (existing.data.length > 0) {
        console.log(`[SKIP] ${plan.name} already exists (${existing.data[0].id})`);
        continue;
      }

      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata,
      });
      console.log(`[OK] Created product: ${product.name} (${product.id})`);

      const mensalPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.prices.mensal,
        currency: 'brl',
        recurring: { interval: 'month' },
        metadata: { period: 'mensal', tier: plan.metadata.tier },
      });
      console.log(`  Mensal: R$ ${(plan.prices.mensal / 100).toFixed(2)}/mês (${mensalPrice.id})`);

      const semestralPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.prices.semestral,
        currency: 'brl',
        recurring: { interval: 'month', interval_count: 1 },
        metadata: { period: 'semestral', tier: plan.metadata.tier, billing_months: '6' },
      });
      console.log(`  Semestral: R$ ${(plan.prices.semestral / 100).toFixed(2)}/mês (${semestralPrice.id})`);

      const anualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.prices.anual,
        currency: 'brl',
        recurring: { interval: 'month', interval_count: 1 },
        metadata: { period: 'anual', tier: plan.metadata.tier, billing_months: '12' },
      });
      console.log(`  Anual: R$ ${(plan.prices.anual / 100).toFixed(2)}/mês (${anualPrice.id})`);
    }

    const existingSingle = await stripe.products.search({
      query: `name:'${SINGLE_PRICE_PLAN.name}' AND active:'true'`
    });

    if (existingSingle.data.length > 0) {
      console.log(`\n[SKIP] ${SINGLE_PRICE_PLAN.name} already exists (${existingSingle.data[0].id})`);
    } else {
      const singleProduct = await stripe.products.create({
        name: SINGLE_PRICE_PLAN.name,
        description: SINGLE_PRICE_PLAN.description,
        metadata: SINGLE_PRICE_PLAN.metadata,
      });
      console.log(`\n[OK] Created product: ${singleProduct.name} (${singleProduct.id})`);

      const singlePrice = await stripe.prices.create({
        product: singleProduct.id,
        unit_amount: SINGLE_PRICE_PLAN.price,
        currency: 'brl',
        recurring: { interval: 'month' },
        metadata: { period: 'mensal', tier: 'single' },
      });
      console.log(`  Mensal: R$ ${(SINGLE_PRICE_PLAN.price / 100).toFixed(2)}/mês (${singlePrice.id})`);
    }

    console.log('\nAll products and prices created successfully!');
    console.log('Webhooks will sync this data to your database automatically.');
  } catch (error: any) {
    console.error('Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
