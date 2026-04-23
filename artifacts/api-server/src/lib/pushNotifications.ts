import { db } from "@workspace/db";
import { pushTokensTable, usersTable, agendamentosTable, barbeariasTable, notificacoesTable, clientePushTokensTable, clienteUsersTable, clientesTable } from "@workspace/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import webpush from "web-push";
import { getParametros } from "./parametros.js";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:marcuslimav123@gmail.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("[Push] VAPID keys configured for web push");
} else {
  console.warn("[Push] VAPID keys not found — web push disabled");
}

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function sendPushToUser(userId: number, message: PushMessage): Promise<void> {
  try {
    const tokens = await db.select().from(pushTokensTable).where(
      and(
        eq(pushTokensTable.userId, userId),
        eq(pushTokensTable.ativo, true)
      )
    );
    if (tokens.length === 0) return;

    const expoPushTokens = tokens.filter(t => t.token.startsWith("ExponentPushToken[") || t.token.startsWith("ExpoPushToken["));
    const webPushTokens = tokens.filter(t => !t.token.startsWith("ExponentPushToken[") && !t.token.startsWith("ExpoPushToken["));

    if (expoPushTokens.length > 0) {
      await sendExpoPush(expoPushTokens.map(t => t.token), message);
    }

    if (webPushTokens.length > 0) {
      await sendWebPush(webPushTokens.map(t => ({ id: t.id, token: t.token })), message);
    }
  } catch (err) {
    console.error(`[Push] Error sending push to user ${userId}:`, err);
  }
}

export async function sendPushToBarbearia(barbeariaId: number, message: PushMessage, excludeUserId?: number): Promise<void> {
  try {
    const users = await db.select({ id: usersTable.id }).from(usersTable).where(
      and(
        eq(usersTable.barbeariaId, barbeariaId),
        eq(usersTable.ativo, true)
      )
    );

    const [barbearia] = await db.select({ donoId: barbeariasTable.donoId }).from(barbeariasTable)
      .where(eq(barbeariasTable.id, barbeariaId)).limit(1);

    const allUserIds = new Set(users.map(u => u.id));

    if (barbearia?.donoId) {
      allUserIds.add(barbearia.donoId);
    }

    if (excludeUserId) allUserIds.delete(excludeUserId);

    try {
      await db.insert(notificacoesTable).values({
        barbeariaId,
        titulo: message.title,
        corpo: message.body,
        tipo: message.data?.type || "geral",
        dados: message.data || {},
      });
    } catch (dbErr) {
      console.error(`[Push] Error storing notification in DB:`, dbErr);
    }

    for (const userId of allUserIds) {
      await sendPushToUser(userId, message);
    }
  } catch (err) {
    console.error(`[Push] Error sending push to barbearia ${barbeariaId}:`, err);
  }
}

async function sendWebPush(tokens: { id: number; token: string }[], message: PushMessage): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log(`[Push] Web push skipped — VAPID keys not configured`);
    return;
  }

  const notifType = message.data?.type || "notification";
  const entityId = message.data?.agendamentoId || message.data?.notificationId || "";
  const stableId = entityId || simpleHash(message.title + message.body);
  const tag = `glow-upi-${notifType}-${stableId}`;

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    data: message.data || {},
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    tag,
  });

  const pushOptions = {
    TTL: 60 * 60,
    urgency: "high" as const,
  };

  for (const tokenRecord of tokens) {
    try {
      const subscription = JSON.parse(tokenRecord.token);
      await webpush.sendNotification(subscription, payload, pushOptions);
      console.log(`[Push] Web push sent to token ${tokenRecord.id}`);
    } catch (err: any) {
      const sc = err.statusCode;
      if (sc === 410 || sc === 404 || sc === 403 || sc === 401 || sc === 400) {
        console.warn(`[Push] Web push token ${tokenRecord.id} rejected (HTTP ${sc}) — deactivating. Client will resubscribe on next open.`);
        try {
          await db.update(pushTokensTable).set({ ativo: false, updatedAt: new Date() })
            .where(eq(pushTokensTable.id, tokenRecord.id));
        } catch (dbErr) {
          console.error(`[Push] Failed to deactivate token ${tokenRecord.id}:`, dbErr);
        }
      } else {
        console.error(`[Push] Web push error for token ${tokenRecord.id}:`, sc || err.message);
      }
    }
  }
}

export async function sendTestPushToUser(userId: number): Promise<{ total: number; success: number; failed: number }> {
  const tokens = await db.select().from(pushTokensTable).where(
    and(
      eq(pushTokensTable.userId, userId),
      eq(pushTokensTable.ativo, true)
    )
  );

  const webTokens = tokens.filter(t => !t.token.startsWith("ExponentPushToken[") && !t.token.startsWith("ExpoPushToken["));
  const expoTokens = tokens.filter(t => t.token.startsWith("ExponentPushToken[") || t.token.startsWith("ExpoPushToken["));

  let success = 0;
  let failed = 0;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const message: PushMessage = {
    title: "Teste Glow Upi",
    body: `Notificação de teste enviada às ${hh}:${mm}:${ss}. Se você está vendo isso, está tudo certo!`,
    data: { type: "test", url: "/agenda", testId: `${Date.now()}` },
  };

  if (webTokens.length > 0) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error("[Push] Cannot send web push test — VAPID keys not configured");
      failed += webTokens.length;
    } else {
      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        data: message.data,
        icon: "/logo-icon.png",
        badge: "/logo-icon.png",
        tag: `glow-upi-test-${message.data!.testId}`,
      });
      for (const t of webTokens) {
        try {
          const sub = JSON.parse(t.token);
          await webpush.sendNotification(sub, payload, { TTL: 60, urgency: "high" });
          success++;
        } catch (err: any) {
          failed++;
          const sc = err.statusCode;
          if (sc === 410 || sc === 404 || sc === 403 || sc === 401 || sc === 400) {
            await db.update(pushTokensTable).set({ ativo: false, updatedAt: new Date() })
              .where(eq(pushTokensTable.id, t.id)).catch(() => {});
          }
          console.error(`[Push] Test push failed for token ${t.id}:`, sc || err.message);
        }
      }
    }
  }

  if (expoTokens.length > 0) {
    const expoResult = await sendExpoPush(expoTokens.map(t => t.token), message);
    success += expoResult.success;
    failed += expoResult.failed;
  }

  return { total: tokens.length, success, failed };
}

async function sendExpoPush(tokens: string[], message: PushMessage): Promise<{ success: number; failed: number }> {
  if (tokens.length === 0) return { success: 0, failed: 0 };
  try {
    const messages = tokens.map(token => ({
      to: token,
      sound: "default" as const,
      title: message.title,
      body: message.body,
      data: message.data || {},
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Push] Expo push failed: ${response.status} ${errorText}`);
      return { success: 0, failed: tokens.length };
    }

    const result = await response.json();
    const tickets: any[] = Array.isArray(result.data) ? result.data : [];
    let success = 0;
    let failed = 0;
    if (tickets.length === 0) {
      success = tokens.length;
    } else {
      for (const t of tickets) {
        if (t && t.status === "ok") success++;
        else failed++;
      }
      const missing = tokens.length - tickets.length;
      if (missing > 0) failed += missing;
    }
    console.log(`[Push] Expo push: ${success} ok, ${failed} failed (of ${tokens.length})`);
    return { success, failed };
  } catch (err) {
    console.error("[Push] Error sending Expo push:", err);
    return { success: 0, failed: tokens.length };
  }
}

export async function sendPushToClienteUser(clienteUserId: number, message: PushMessage): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    const tokens = await db.select().from(clientePushTokensTable).where(
      and(
        eq(clientePushTokensTable.clienteUserId, clienteUserId),
        eq(clientePushTokensTable.ativo, true)
      )
    );
    if (tokens.length === 0) return;

    const clientNotifType = message.data?.type || "notification";
    const clientEntityId = message.data?.agendamentoId || message.data?.notificationId || "";
    const clientStableId = clientEntityId || simpleHash(message.title + message.body);

    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      data: message.data || {},
      icon: "/logo-icon.png",
      badge: "/logo-icon.png",
      tag: `cliente-${clientNotifType}-${clientStableId}`,
    });

    const pushOptions = {
      TTL: 60 * 60,
      urgency: "high" as const,
    };

    for (const tokenRecord of tokens) {
      try {
        const subscription = JSON.parse(tokenRecord.token);
        await webpush.sendNotification(subscription, payload, pushOptions);
        console.log(`[Push] Client push sent to clienteUser ${clienteUserId}, token ${tokenRecord.id}`);
      } catch (err: any) {
        const sc = err.statusCode;
        if (sc === 410 || sc === 404 || sc === 403 || sc === 401 || sc === 400) {
          console.warn(`[Push] Client push token ${tokenRecord.id} rejected (HTTP ${sc}) — deactivating.`);
          try {
            await db.update(clientePushTokensTable).set({ ativo: false, updatedAt: new Date() })
              .where(eq(clientePushTokensTable.id, tokenRecord.id));
          } catch (dbErr) {
            console.error(`[Push] Failed to deactivate client token ${tokenRecord.id}:`, dbErr);
          }
        } else {
          console.error(`[Push] Client web push error for token ${tokenRecord.id}:`, sc || err.message);
        }
      }
    }
  } catch (err) {
    console.error(`[Push] Error sending push to clienteUser ${clienteUserId}:`, err);
  }
}

const sentReminders = new Set<string>();

function cleanupOldReminders(): void {
  if (sentReminders.size > 5000) {
    sentReminders.clear();
  }
}

export async function sendAgendamentoReminders(): Promise<void> {
  try {
    cleanupOldReminders();
    const now = new Date();
    const reminderMinutes = 30;
    const targetTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);

    const nowDate = now.toISOString().split("T")[0];
    const targetDate = targetTime.toISOString().split("T")[0];

    const nowHH = now.getHours().toString().padStart(2, "0");
    const nowMM = now.getMinutes().toString().padStart(2, "0");
    const targetHH = targetTime.getHours().toString().padStart(2, "0");
    const targetMM = targetTime.getMinutes().toString().padStart(2, "0");
    const nowTimeStr = `${nowHH}:${nowMM}`;
    const targetTimeStr = `${targetHH}:${targetMM}`;

    let upcomingAgendamentos: (typeof agendamentosTable.$inferSelect)[] = [];

    if (nowDate === targetDate) {
      upcomingAgendamentos = await db.select().from(agendamentosTable).where(
        and(
          eq(agendamentosTable.data, nowDate),
          eq(agendamentosTable.status, "confirmado"),
          gte(agendamentosTable.horaInicio, nowTimeStr),
          lte(agendamentosTable.horaInicio, targetTimeStr)
        )
      );
    } else {
      const todayAgends = await db.select().from(agendamentosTable).where(
        and(
          eq(agendamentosTable.data, nowDate),
          eq(agendamentosTable.status, "confirmado"),
          gte(agendamentosTable.horaInicio, nowTimeStr)
        )
      );
      const tomorrowAgends = await db.select().from(agendamentosTable).where(
        and(
          eq(agendamentosTable.data, targetDate),
          eq(agendamentosTable.status, "confirmado"),
          lte(agendamentosTable.horaInicio, targetTimeStr)
        )
      );
      upcomingAgendamentos = [...todayAgends, ...tomorrowAgends];
    }

    for (const agend of upcomingAgendamentos) {
      const reminderKey = `reminder:${agend.id}:${agend.data}:${agend.horaInicio}`;
      if (sentReminders.has(reminderKey)) continue;

      sentReminders.add(reminderKey);

      const users = await db.select().from(usersTable).where(
        and(
          eq(usersTable.barbeariaId, agend.barbeariaId),
          eq(usersTable.ativo, true)
        )
      );

      const profUsers = users.filter(u => u.profissionalId === agend.profissionalId);
      const gestorUsers = users.filter(u => u.role === "gerente" || u.role === "dono");

      const targetUsers = [...profUsers, ...gestorUsers];
      const uniqueUsers = Array.from(new Map(targetUsers.map(u => [u.id, u])).values());

      for (const user of uniqueUsers) {
        await sendPushToUser(user.id, {
          title: "Lembrete de Agendamento",
          body: `${agend.clienteNome} - ${agend.servicoNome} às ${agend.horaInicio}`,
          data: { agendamentoId: agend.id, type: "reminder", url: "/agenda" },
        });
      }
    }
  } catch (err) {
    console.error("[Push] Error sending reminders:", err);
  }
}

const sentClientReminders = new Set<string>();

export async function sendClienteAgendamentoReminders(): Promise<void> {
  try {
    if (sentClientReminders.size > 5000) sentClientReminders.clear();
    const now = new Date();
    const nowStr = now.toISOString();

    const intervals = [
      { label: "1dia", minutes: 24 * 60, paramKey: "notif_cliente_lembrete_1dia" },
      { label: "2h", minutes: 2 * 60, paramKey: "notif_cliente_lembrete_2h" },
      { label: "30min", minutes: 30, paramKey: "notif_cliente_lembrete_30min" },
    ];

    const nowDate = now.toISOString().split("T")[0];

    for (const interval of intervals) {
      const targetTime = new Date(now.getTime() + interval.minutes * 60 * 1000);
      const targetDate = targetTime.toISOString().split("T")[0];
      const targetHH = targetTime.getHours().toString().padStart(2, "0");
      const targetMM = targetTime.getMinutes().toString().padStart(2, "0");
      const targetTimeStr = `${targetHH}:${targetMM}`;
      const nowHH = now.getHours().toString().padStart(2, "0");
      const nowMM = now.getMinutes().toString().padStart(2, "0");
      const nowTimeStr = `${nowHH}:${nowMM}`;

      let agendamentos: (typeof agendamentosTable.$inferSelect)[] = [];
      if (nowDate === targetDate) {
        agendamentos = await db.select().from(agendamentosTable).where(
          and(
            eq(agendamentosTable.data, nowDate),
            eq(agendamentosTable.status, "confirmado"),
            gte(agendamentosTable.horaInicio, nowTimeStr),
            lte(agendamentosTable.horaInicio, targetTimeStr)
          )
        );
      } else {
        const todayAgends = await db.select().from(agendamentosTable).where(
          and(
            eq(agendamentosTable.data, nowDate),
            eq(agendamentosTable.status, "confirmado"),
            gte(agendamentosTable.horaInicio, nowTimeStr)
          )
        );
        const tomorrowAgends = await db.select().from(agendamentosTable).where(
          and(
            eq(agendamentosTable.data, targetDate),
            eq(agendamentosTable.status, "confirmado"),
            lte(agendamentosTable.horaInicio, targetTimeStr)
          )
        );
        agendamentos = [...todayAgends, ...tomorrowAgends];
      }

      const barbeariaIds = [...new Set(agendamentos.map(a => a.barbeariaId))];
      const barbeariaParams: Record<number, Record<string, string>> = {};
      for (const bid of barbeariaIds) {
        try {
          barbeariaParams[bid] = await getParametros(bid);
        } catch {}
      }

      for (const agend of agendamentos) {
        const reminderKey = `client-reminder:${agend.id}:${interval.label}`;
        if (sentClientReminders.has(reminderKey)) continue;

        const params = barbeariaParams[agend.barbeariaId] || {};
        if (params[interval.paramKey] !== "Sim") continue;

        if (!agend.clienteId) continue;

        const [cliente] = await db.select({ email: clientesTable.email }).from(clientesTable)
          .where(eq(clientesTable.id, agend.clienteId)).limit(1);
        if (!cliente?.email) continue;

        const [clienteUser] = await db.select().from(clienteUsersTable).where(
          eq(clienteUsersTable.email, cliente.email)
        ).limit(1);

        if (!clienteUser) continue;

        sentClientReminders.add(reminderKey);

        const labelTexts: Record<string, string> = {
          "1dia": "amanhã",
          "2h": "em 2 horas",
          "30min": "em 30 minutos",
        };
        const labelText = labelTexts[interval.label] || "";

        const [barbearia] = await db.select({ slug: barbeariasTable.slug }).from(barbeariasTable)
          .where(eq(barbeariasTable.id, agend.barbeariaId)).limit(1);
        const slug = barbearia?.slug || "";

        await sendPushToClienteUser(clienteUser.id, {
          title: "Lembrete de Agendamento",
          body: `${agend.servicoNome} com ${agend.profissionalNome} ${labelText} às ${agend.horaInicio}`,
          data: {
            agendamentoId: agend.id,
            type: "agendamento_lembrete",
            slug,
            url: slug ? `/${slug}?agendamentoId=${agend.id}` : `/agendamentos/${agend.id}`,
            servicoNome: agend.servicoNome,
            profissionalNome: agend.profissionalNome,
            horaInicio: agend.horaInicio,
            data: agend.data,
          },
        });
      }
    }
  } catch (err) {
    console.error("[Push] Error sending client reminders:", err);
  }
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderService(): void {
  if (reminderInterval) return;
  console.log("[Push] Starting reminder service (every 5 minutes)");
  reminderInterval = setInterval(() => {
    sendAgendamentoReminders().catch(err =>
      console.error("[Push] Reminder service error:", err)
    );
    sendClienteAgendamentoReminders().catch(err =>
      console.error("[Push] Client reminder service error:", err)
    );
  }, 5 * 60 * 1000);

  sendAgendamentoReminders().catch(err =>
    console.error("[Push] Initial reminder check error:", err)
  );
  sendClienteAgendamentoReminders().catch(err =>
    console.error("[Push] Initial client reminder check error:", err)
  );
}
