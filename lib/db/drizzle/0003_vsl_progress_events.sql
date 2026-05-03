CREATE TABLE "vsl_progress_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" text NOT NULL,
  	"percent" integer NOT NULL,
  	"created_at" timestamp DEFAULT now() NOT NULL
  );
  --> statement-breakpoint
  CREATE INDEX "vsl_progress_session_idx" ON "vsl_progress_events" USING btree ("session_id");
  --> statement-breakpoint
  CREATE INDEX "vsl_progress_created_at_idx" ON "vsl_progress_events" USING btree ("created_at");
  