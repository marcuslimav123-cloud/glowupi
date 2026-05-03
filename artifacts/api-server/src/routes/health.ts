import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { getVapidPublicKey } from "../lib/pushNotifications.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/push", async (_req, res) => {
  const vapidPublicConfigured = !!getVapidPublicKey();
  const vapidPrivateConfigured = !!process.env.VAPID_PRIVATE_KEY;
  const webPushEnabled = vapidPublicConfigured && vapidPrivateConfigured;

  let activeTokens = { expo: 0, web: 0, total: 0 };
  let dbOk = true;
  try {
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE token LIKE 'ExponentPushToken[%' OR token LIKE 'ExpoPushToken[%') AS expo,
        COUNT(*) FILTER (WHERE token NOT LIKE 'ExponentPushToken[%' AND token NOT LIKE 'ExpoPushToken[%') AS web,
        COUNT(*) AS total
      FROM ${pushTokensTable}
      WHERE ${eq(pushTokensTable.ativo, true)}
    `);
    const r: any = (rows as any).rows?.[0] ?? (Array.isArray(rows) ? rows[0] : undefined);
    if (r) {
      activeTokens = {
        expo: Number(r.expo) || 0,
        web: Number(r.web) || 0,
        total: Number(r.total) || 0,
      };
    }
  } catch (err) {
    dbOk = false;
    console.error("[Health] push token count failed:", err);
  }

  res.json({
    expoPush: { enabled: true },
    webPush: {
      enabled: webPushEnabled,
      vapidPublicConfigured,
      vapidPrivateConfigured,
      reason: webPushEnabled ? null : "Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY para habilitar web push.",
    },
    activeTokens,
    db: dbOk ? "ok" : "error",
  });
});

export default router;
