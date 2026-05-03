import { db } from "@workspace/db";
import { pushTokensTable, usersTable, agendamentosTable, barbeariasTable, notificacoesTable, clientePushTokensTable, clienteUsersTable, clientesTable } from "@workspace/db/schema";
import { eq, and, gte, lte, inArray, lt, sql } from "drizzle-orm";
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
  category?: PushCategory;
}

export type PushCategory = "agenda" | "financeiro" | "equipe" | "marketing" | "sistema";

const CATEGORY_PARAM_KEY: Record<PushCategory, string> = {
  agenda: "notif_push_agenda",
  financeiro: "notif_push_financeiro",
  equipe: "notif_push_equipe",
  marketing: "notif_push_marketing",
  sistema: "notif_push_sistema",
};

export const PUSH_CATEGORIES: { key: PushCategory; label: string; description: string }[] = [
  { key: "agenda", label: "Agenda", description: "Novos agendamentos, cancelamentos, lembretes e pendências de aprovação" },
  { key: "financeiro", label: "Financeiro", description: "Comandas fechadas e pagas, contas a pagar, sangrias, vales e comissões liberadas" },
  { key: "equipe", label: "Equipe", description: "Novos membros que aceitaram convite e mudanças no time" },
  { key: "marketing", label: "Marketing", description: "Avaliações recebidas, aniversariantes e campanhas" },
  { key: "sistema", label: "Sistema", description: "Status da assinatura, cobrança recusada e alertas gerais" },
];

export function categoryForType(type: string | undefined): PushCategory {
  const t = String(type || "").toLowerCase();
  if (!t || t === "test") return "sistema";
  if (t.startsWith("agend") || t === "reminder" || t === "pending_appointments_nudge"
    || t === "new_appointment" || t === "pending_appointment" || t === "cancelled_appointment"
    || t === "new_atendimento") return "agenda";
  if (t.startsWith("comanda") || t.startsWith("conta_") || t.startsWith("comissao")
    || t.startsWith("caixa") || t === "sangria" || t === "vale") return "financeiro";
  if (t.startsWith("convite") || t.startsWith("equipe") || t === "novo_membro") return "equipe";
  if (t.startsWith("avaliacao") || t.startsWith("aniversario") || t.startsWith("marketing")) return "marketing";
  return "sistema";
}

async function isCategoriaAtiva(barbeariaId: number, category: PushCategory): Promise<boolean> {
  try {
    const params = await getParametros(barbeariaId);
    const v = params[CATEGORY_PARAM_KEY[category]];
    return v !== "Não";
  } catch {
    return true;
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

type TokenRecord = { id: number; token: string };

export async function sendPushToUser(userId: number, message: PushMessage): Promise<void> {
  try {
    const [user] = await db.select({ barbeariaId: usersTable.barbeariaId })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user?.barbeariaId) {
      const category = message.category || categoryForType(message.data?.type);
      const ativo = await isCategoriaAtiva(user.barbeariaId, category);
      if (!ativo) {
        console.log(`[Push] Skipped user ${userId} — categoria '${category}' desativada`);
        return;
      }
    }

    const tokens = await db.select().from(pushTokensTable).where(
      and(
        eq(pushTokensTable.userId, userId),
        eq(pushTokensTable.ativo, true)
      )
    );
    if (tokens.length === 0) return;

    const expoPushTokens = tokens.filter(t => isExpoToken(t.token)).map(t => ({ id: t.id, token: t.token }));
    const webPushTokens = tokens.filter(t => !isExpoToken(t.token)).map(t => ({ id: t.id, token: t.token }));

    await Promise.all([
      expoPushTokens.length > 0 ? sendExpoPushRecords(expoPushTokens, message) : Promise.resolve(),
      webPushTokens.length > 0 ? sendWebPush(webPushTokens, message) : Promise.resolve(),
    ]);
  } catch (err) {
    console.error(`[Push] Error sending push to user ${userId}:`, err);
  }
}

export async function sendPushToBarbearia(barbeariaId: number, message: PushMessage, excludeUserId?: number): Promise<void> {
  try {
    const category = message.category || categoryForType(message.data?.type);
    const ativo = await isCategoriaAtiva(barbeariaId, category);
    if (!ativo) {
      console.log(`[Push] Skipped — categoria '${category}' desativada para barbearia ${barbeariaId}`);
      return;
    }

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
        dados: { ...(message.data || {}), category },
      });
    } catch (dbErr) {
      console.error(`[Push] Error storing notification in DB:`, dbErr);
    }

    const userIdsArray = Array.from(allUserIds);
    if (userIdsArray.length === 0) return;

    const allTokens = await db.select().from(pushTokensTable).where(
      and(
        inArray(pushTokensTable.userId, userIdsArray),
        eq(pushTokensTable.ativo, true)
      )
    );
    if (allTokens.length === 0) return;

    const expoTokens: TokenRecord[] = [];
    const webTokens: TokenRecord[] = [];
    for (const t of allTokens) {
      if (isExpoToken(t.token)) expoTokens.push({ id: t.id, token: t.token });
      else webTokens.push({ id: t.id, token: t.token });
    }

    await Promise.all([
      expoTokens.length > 0 ? sendExpoPushRecords(expoTokens, message) : Promise.resolve(),
      webTokens.length > 0 ? sendWebPush(webTokens, message) : Promise.resolve(),
    ]);
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

  const CONCURRENCY = 10;
  const deadIds: number[] = [];

  for (let i = 0; i < tokens.length; i += CONCURRENCY) {
    const batch = tokens.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (tokenRecord) => {
      try {
        const subscription = JSON.parse(tokenRecord.token);
        await webpush.sendNotification(subscription, payload, pushOptions);
      } catch (err) {
        const sc = (err as { statusCode?: number }).statusCode;
        const msg = (err as { message?: string }).message;
        if (sc === 410 || sc === 404 || sc === 403 || sc === 401 || sc === 400) {
          console.warn(`[Push] Web push token ${tokenRecord.id} rejected (HTTP ${sc}) — deactivating.`);
          deadIds.push(tokenRecord.id);
        } else {
          console.error(`[Push] Web push error for token ${tokenRecord.id}:`, sc || msg);
        }
      }
    }));
  }

  if (deadIds.length > 0) {
    try {
      await db.update(pushTokensTable).set({ ativo: false, updatedAt: new Date() })
        .where(inArray(pushTokensTable.id, deadIds));
    } catch (dbErr) {
      console.error(`[Push] Failed to deactivate ${deadIds.length} web push token(s):`, dbErr);
    }
  }
}

export async function sendTestPushToUser(userId: number): Promise<{
  total: number;
  success: number;
  failed: number;
  webTotal: number;
  webSuccess: number;
  webFailed: number;
  expoTotal: number;
  expoSuccess: number;
  expoFailed: number;
}> {
  const tokens = await db.select().from(pushTokensTable).where(
    and(
      eq(pushTokensTable.userId, userId),
      eq(pushTokensTable.ativo, true)
    )
  );

  const webTokens = tokens.filter(t => !t.token.startsWith("ExponentPushToken[") && !t.token.startsWith("ExpoPushToken["));
  const expoTokens = tokens.filter(t => t.token.startsWith("ExponentPushToken[") || t.token.startsWith("ExpoPushToken["));

  let webSuccess = 0;
  let webFailed = 0;
  let expoSuccess = 0;
  let expoFailed = 0;

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
      webFailed += webTokens.length;
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
          webSuccess++;
        } catch (err: any) {
          webFailed++;
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
    const expoResult = await sendExpoPushRecords(expoTokens.map(t => ({ id: t.id, token: t.token })), message);
    expoSuccess += expoResult.success;
    expoFailed += expoResult.failed;
  }

  const success = webSuccess + expoSuccess;
  const failed = webFailed + expoFailed;
  return {
    total: tokens.length,
    success,
    failed,
    webTotal: webTokens.length,
    webSuccess,
    webFailed,
    expoTotal: expoTokens.length,
    expoSuccess,
    expoFailed,
  };
}

const EXPO_DEAD_TOKEN_ERRORS = new Set([
  "DeviceNotRegistered",
  "InvalidCredentials",
  "MismatchSenderId",
]);

async function deactivatePushTokensByIds(ids: number[], reason: string): Promise<void> {
  if (ids.length === 0) return;
  try {
    await db.update(pushTokensTable)
      .set({ ativo: false, updatedAt: new Date() })
      .where(inArray(pushTokensTable.id, ids));
    console.warn(`[Push] Deactivated ${ids.length} expo token(s) — reason: ${reason}`);
  } catch (err) {
    console.error(`[Push] Failed to deactivate expo tokens:`, err);
  }
}

const EXPO_BATCH_SIZE = 100;

async function sendExpoPushRecords(records: TokenRecord[], message: PushMessage): Promise<{ success: number; failed: number }> {
  if (records.length === 0) return { success: 0, failed: 0 };

  const chunks: TokenRecord[][] = [];
  for (let i = 0; i < records.length; i += EXPO_BATCH_SIZE) {
    chunks.push(records.slice(i, i + EXPO_BATCH_SIZE));
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  const chunkResults = await Promise.all(chunks.map(chunk => sendExpoPush(chunk.map(r => r.token), message)));

  const deadIdsAll: number[] = [];
  const queuedAt = Date.now();

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    const result = chunkResults[c];
    totalSuccess += result.success;
    totalFailed += result.failed;
    for (const idx of result.deadIndexes) {
      const rec = chunk[idx];
      if (rec) deadIdsAll.push(rec.id);
    }
    for (let i = 0; i < result.ticketIds.length; i++) {
      const ticketId = result.ticketIds[i];
      const rec = chunk[i];
      if (ticketId && rec) {
        pendingReceipts.set(ticketId, { tokenId: rec.id, queuedAt });
      }
    }
  }

  if (deadIdsAll.length > 0) {
    await deactivatePushTokensByIds(deadIdsAll, "Expo DeviceNotRegistered/InvalidCredentials");
  }

  return { success: totalSuccess, failed: totalFailed };
}

type ExpoTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message?: string; details?: { error?: string } };

type ExpoReceipt =
  | { status: "ok" }
  | { status: "error"; message?: string; details?: { error?: string } };

const pendingReceipts = new Map<string, { tokenId: number; queuedAt: number }>();
const RECEIPT_MAX_AGE_MS = 60 * 60 * 1000;

async function sendExpoPush(tokens: string[], message: PushMessage): Promise<{ success: number; failed: number; deadIndexes: number[]; ticketIds: (string | null)[] }> {
  if (tokens.length === 0) return { success: 0, failed: 0, deadIndexes: [], ticketIds: [] };
  try {
    const channelId = message.data?.channelId
      || (message.data?.type === "reminder" || message.data?.type === "agendamento_lembrete" || message.data?.type === "agendamento"
        ? "lembretes-agendamentos"
        : "default");
    const messages = tokens.map(token => ({
      to: token,
      sound: "default" as const,
      title: message.title,
      body: message.body,
      data: message.data || {},
      channelId,
      priority: "high" as const,
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
      return { success: 0, failed: tokens.length, deadIndexes: [], ticketIds: [] };
    }

    const result = (await response.json()) as { data?: ExpoTicket[] };
    const tickets: ExpoTicket[] = Array.isArray(result.data) ? result.data : [];
    let success = 0;
    let failed = 0;
    const deadIndexes: number[] = [];
    const ticketIds: (string | null)[] = [];
    if (tickets.length === 0) {
      success = tokens.length;
      for (let i = 0; i < tokens.length; i++) ticketIds.push(null);
    } else {
      for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        if (t && t.status === "ok") {
          success++;
          ticketIds.push(t.id);
        } else {
          failed++;
          ticketIds.push(null);
          const errCode = t?.status === "error" ? t.details?.error : undefined;
          if (errCode && EXPO_DEAD_TOKEN_ERRORS.has(errCode)) {
            deadIndexes.push(i);
          }
        }
      }
      const missing = tokens.length - tickets.length;
      for (let i = 0; i < missing; i++) {
        failed++;
        ticketIds.push(null);
      }
    }
    console.log(`[Push] Expo push: ${success} ok, ${failed} failed (of ${tokens.length}), dead=${deadIndexes.length}`);
    return { success, failed, deadIndexes, ticketIds };
  } catch (err) {
    console.error("[Push] Error sending Expo push:", err);
    return { success: 0, failed: tokens.length, deadIndexes: [], ticketIds: [] };
  }
}

export async function pollExpoReceipts(): Promise<void> {
  if (pendingReceipts.size === 0) return;
  const now = Date.now();
  for (const [id, info] of pendingReceipts) {
    if (now - info.queuedAt > RECEIPT_MAX_AGE_MS) pendingReceipts.delete(id);
  }
  const ids = Array.from(pendingReceipts.keys());
  if (ids.length === 0) return;

  const CHUNK = 1000;
  const deadTokenIds: number[] = [];

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: chunk }),
      });
      if (!response.ok) {
        console.error(`[Push] Expo getReceipts failed: ${response.status}`);
        continue;
      }
      const json = (await response.json()) as { data?: Record<string, ExpoReceipt> };
      const receipts = json.data || {};
      for (const id of chunk) {
        const r = receipts[id];
        if (!r) continue;
        const info = pendingReceipts.get(id);
        if (!info) continue;
        if (r.status === "ok") {
          pendingReceipts.delete(id);
        } else {
          const errCode = r.details?.error;
          if (errCode && EXPO_DEAD_TOKEN_ERRORS.has(errCode)) {
            deadTokenIds.push(info.tokenId);
          }
          pendingReceipts.delete(id);
        }
      }
    } catch (err) {
      console.error("[Push] pollExpoReceipts error:", err);
    }
  }

  if (deadTokenIds.length > 0) {
    await deactivatePushTokensByIds(Array.from(new Set(deadTokenIds)), "Expo receipt DeviceNotRegistered/InvalidCredentials");
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
      const barbeariaModoHumano: Record<number, boolean> = {};
      for (const bid of barbeariaIds) {
        try {
          barbeariaParams[bid] = await getParametros(bid);
          const [b] = await db.select({ modoHumano: barbeariasTable.modoHumano })
            .from(barbeariasTable).where(eq(barbeariasTable.id, bid)).limit(1);
          barbeariaModoHumano[bid] = !!b?.modoHumano;
        } catch {}
      }

      for (const agend of agendamentos) {
        const reminderKey = `client-reminder:${agend.id}:${interval.label}`;
        if (sentClientReminders.has(reminderKey)) continue;

        const params = barbeariaParams[agend.barbeariaId] || {};
        if (params[interval.paramKey] !== "Sim") continue;

        if (barbeariaModoHumano[agend.barbeariaId]) {
          sentClientReminders.add(reminderKey);
          try {
            const { criarSugerida } = await import("./mensagensSugeridas.js");
            await criarSugerida({
              barbeariaId: agend.barbeariaId,
              tipo: "lembrete",
              agendamentoId: agend.id,
              clienteId: agend.clienteId ?? null,
              contexto: { intervalo: interval.label, servico: agend.servicoNome, profissional: agend.profissionalNome, data: agend.data, hora: agend.horaInicio },
              dedupeKey: `lembrete:${agend.barbeariaId}:${agend.id}:${interval.label}`,
              fallbackTexto: `Olá ${agend.clienteNome}! Lembrando do seu horário de ${agend.servicoNome} com ${agend.profissionalNome} em ${agend.data} às ${agend.horaInicio}.`,
              categoriaPreferida: "lembrete",
            });
          } catch (e) {
            console.error("[Push] sugerida lembrete error:", e);
          }
          continue;
        }

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

const STALE_TOKEN_CUTOFF = new Date("2026-04-23T00:00:00.000Z");
let staleCleanupDone = false;

export async function cleanupStalePushTokensOnce(): Promise<void> {
  if (staleCleanupDone) return;
  staleCleanupDone = true;
  try {
    const res = await db
      .update(pushTokensTable)
      .set({ ativo: false, updatedAt: new Date() })
      .where(
        and(
          eq(pushTokensTable.ativo, true),
          eq(pushTokensTable.platform, "web"),
          lt(pushTokensTable.updatedAt, STALE_TOKEN_CUTOFF)
        )
      )
      .returning({ id: pushTokensTable.id });
    if (res.length > 0) {
      console.log(`[Push] Startup cleanup: deactivated ${res.length} stale web push token(s) created before VAPID-validation fix.`);
    } else {
      console.log("[Push] Startup cleanup: no stale web push tokens found.");
    }
  } catch (err) {
    console.error("[Push] Startup cleanup failed:", err);
  }
}

const lastPendingNudgeAt = new Map<number, number>();
const PENDING_NUDGE_INTERVAL_MS = 30 * 60 * 1000;

export async function sendPendingApprovalNudges(): Promise<void> {
  try {
    const pendentes = await db.select().from(agendamentosTable).where(
      eq(agendamentosTable.status, "pendente_aprovacao")
    );
    if (pendentes.length === 0) return;
    const byBarbearia = new Map<number, typeof pendentes>();
    for (const p of pendentes) {
      const arr = byBarbearia.get(p.barbeariaId) || [];
      arr.push(p);
      byBarbearia.set(p.barbeariaId, arr);
    }
    const now = Date.now();
    for (const [barbeariaId, items] of byBarbearia) {
      const last = lastPendingNudgeAt.get(barbeariaId) || 0;
      if (now - last < PENDING_NUDGE_INTERVAL_MS) continue;
      lastPendingNudgeAt.set(barbeariaId, now);
      const count = items.length;
      const body = count === 1
        ? `Você tem 1 agendamento aguardando aprovação. Toque para revisar.`
        : `Você tem ${count} agendamentos aguardando aprovação. Toque para revisar.`;
      try {
        await sendPushToBarbearia(barbeariaId, {
          title: "Lembrete: agendamentos pendentes",
          body,
          data: { type: "pending_appointments_nudge", count, url: "/agenda" },
        });
      } catch (err) {
        console.error(`[Push] Pending nudge error for barbearia ${barbeariaId}:`, err);
      }
    }
  } catch (err) {
    console.error("[Push] sendPendingApprovalNudges error:", err);
  }
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderService(): void {
  if (reminderInterval) return;
  console.log("[Push] Starting reminder service (every 5 minutes)");
  cleanupStalePushTokensOnce().catch(err =>
    console.error("[Push] Startup cleanup error:", err)
  );
  reminderInterval = setInterval(() => {
    sendAgendamentoReminders().catch(err =>
      console.error("[Push] Reminder service error:", err)
    );
    sendClienteAgendamentoReminders().catch(err =>
      console.error("[Push] Client reminder service error:", err)
    );
    sendPendingApprovalNudges().catch(err =>
      console.error("[Push] Pending nudge service error:", err)
    );
    pollExpoReceipts().catch(err =>
      console.error("[Push] Expo receipt poll error:", err)
    );
  }, 5 * 60 * 1000);

  sendAgendamentoReminders().catch(err =>
    console.error("[Push] Initial reminder check error:", err)
  );
  sendClienteAgendamentoReminders().catch(err =>
    console.error("[Push] Initial client reminder check error:", err)
  );
  sendPendingApprovalNudges().catch(err =>
    console.error("[Push] Initial pending nudge check error:", err)
  );
}
