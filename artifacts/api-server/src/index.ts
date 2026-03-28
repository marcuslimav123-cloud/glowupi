import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient.js";
import { seedSuperAdmins } from "./lib/adminAuth.js";
import { startReminderService } from "./lib/pushNotifications.js";
import app from "./app.js";

async function initStripe(retryCount = 0): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log(`Initializing Stripe schema... (attempt ${retryCount + 1})`);
    await runMigrations({
      databaseUrl,
      schema: 'stripe'
    });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const webhookResult = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    console.log('Webhook configured:', JSON.stringify(webhookResult?.webhook?.url || 'setup complete'));

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        console.log('Stripe data synced');
      })
      .catch((err: any) => {
        console.error('Error syncing Stripe data:', err);
      });
  } catch (error) {
    console.error(`Failed to initialize Stripe (attempt ${retryCount + 1}):`, error);
    if (retryCount < 3) {
      const delay = (retryCount + 1) * 3000;
      console.log(`Retrying Stripe init in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return initStripe(retryCount + 1);
    }
    console.error('Stripe initialization failed after all retries');
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startReminderService();

  initStripe().catch(err => console.error("Stripe init error:", err));
  seedSuperAdmins().catch(err => console.error("Error seeding super admins:", err));
});
