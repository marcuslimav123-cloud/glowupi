import { pgTable, serial, text, timestamp, integer, bigint, boolean, index } from "drizzle-orm/pg-core";

export const campaignEventsTable = pgTable("campaign_events", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(),
  sessionId: text("session_id"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  fbclid: text("fbclid"),
  gclid: text("gclid"),
  referrer: text("referrer"),
  landingPage: text("landing_page"),
  pagePath: text("page_path"),
  valueCents: bigint("value_cents", { mode: "number" }),
  currency: text("currency"),
  barbeariaId: integer("barbearia_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  capiStatus: text("capi_status"),
  capiError: text("capi_error"),
  hasEmail: boolean("has_email"),
  hasPhone: boolean("has_phone"),
  hasFbp: boolean("has_fbp"),
  hasFbc: boolean("has_fbc"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  tipoIdx: index("campaign_events_tipo_idx").on(t.tipo),
  sessionIdx: index("campaign_events_session_idx").on(t.sessionId),
  createdAtIdx: index("campaign_events_created_at_idx").on(t.createdAt),
  utmSourceIdx: index("campaign_events_utm_source_idx").on(t.utmSource),
  capiStatusIdx: index("campaign_events_capi_status_idx").on(t.capiStatus),
}));

export type CampaignEvent = typeof campaignEventsTable.$inferSelect;
export type InsertCampaignEvent = typeof campaignEventsTable.$inferInsert;
