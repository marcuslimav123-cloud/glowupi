import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { superAdminsTable } from "./superAdmins";
import { usersTable } from "./users";
import { barbeariasTable } from "./barbearias";

export const trialLinksTable = pgTable("trial_links", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  createdByAdminId: integer("created_by_admin_id").notNull().references(() => superAdminsTable.id),
  trialDays: integer("trial_days").notNull().default(7),
  used: boolean("used").notNull().default(false),
  usedAt: timestamp("used_at"),
  usedByEmail: text("used_by_email"),
  usedByUserId: integer("used_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  usedByBarbeariaId: integer("used_by_barbearia_id").references(() => barbeariasTable.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
