import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient.js";
import { seedSuperAdmins } from "./lib/adminAuth.js";
import { startReminderService } from "./lib/pushNotifications.js";
import { startTrialExpiryJob } from "./lib/trialScheduler.js";
import { startTrialCleanupScheduler } from "./lib/trialCleanup.js";
import app from "./app.js";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
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
    console.error('Failed to initialize Stripe:', error);
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

await initStripe();
await seedSuperAdmins().catch(err => console.error("Error seeding super admins:", err));

import { startEmailMarketingWorker } from "./routes/emailMarketing.js";
import { cleanupExpiredSessions } from "./lib/auth.js";

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startReminderService();
  startTrialExpiryJob();
  startTrialCleanupScheduler();
  startEmailMarketingWorker();
  cleanupExpiredSessions().then(() => console.log("[Sessions] Startup cleanup done."))
    .catch(err => console.error("[Sessions] Startup cleanup error:", err));
  setInterval(() => {
    cleanupExpiredSessions().catch(err => console.error("[Sessions] Periodic cleanup error:", err));
  }, 6 * 60 * 60 * 1000);
});
