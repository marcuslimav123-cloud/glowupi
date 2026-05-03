-- Fix asaas_webhook_events dedupe to prevent platform-event races (NULL allows duplicates)
DROP INDEX IF EXISTS "asaas_webhook_dedupe_unique_idx";
--> statement-breakpoint
UPDATE "asaas_webhook_events" SET "dedupe_key" = 'legacy|' || "id"::text WHERE "dedupe_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "asaas_webhook_events" ALTER COLUMN "dedupe_key" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "asaas_webhook_dedupe_unique_idx" ON "asaas_webhook_events" USING btree ("dedupe_key");
