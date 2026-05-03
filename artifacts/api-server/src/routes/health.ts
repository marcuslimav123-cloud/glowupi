import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { getVapidPublicKey } from "../lib/pushNotifications.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

interface PushTokenCounts {
  expo: number;
  web: number;
  total: number;
}

router.get("/health/push", requireAuth, requireRole("dono"), async (_req, res) => {
  const vapidPublicConfigured = !!getVapidPublicKey();
  const vapidPrivateConfigured = !!process.env.VAPID_PRIVATE_KEY;
  const webPushEnabled = vapidPublicConfigured && vapidPrivateConfigured;

  let activeTokens: PushTokenCounts = { expo: 0, web: 0, total: 0 };
  let dbOk = true;
  try {
    const result = await db.execute<{ expo: string | number; web: string | number; total: string | number }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE token LIKE 'ExponentPushToken[%' OR token LIKE 'ExpoPushToken[%') AS expo,
        COUNT(*) FILTER (WHERE token NOT LIKE 'ExponentPushToken[%' AND token NOT LIKE 'ExpoPushToken[%') AS web,
        COUNT(*) AS total
      FROM ${pushTokensTable}
      WHERE ${eq(pushTokensTable.ativo, true)}
    `);
    const rowsArr = (result as { rows?: Array<{ expo: string | number; web: string | number; total: string | number }> }).rows
      ?? (Array.isArray(result) ? result : []);
    const r = rowsArr[0];
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
    expoPush: { enabled: true, info: "Expo Push usa receipts polled a cada 5 min para limpar tokens DeviceNotRegistered." },
    webPush: {
      enabled: webPushEnabled,
      vapidPublicConfigured,
      vapidPrivateConfigured,
      reason: webPushEnabled
        ? null
        : "Web push desabilitado. Configure os secrets VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (e opcionalmente VAPID_SUBJECT) para habilitar. Gere o par com: npx web-push generate-vapid-keys",
    },
    activeTokens,
    db: dbOk ? "ok" : "error",
  });
});

export default router;
