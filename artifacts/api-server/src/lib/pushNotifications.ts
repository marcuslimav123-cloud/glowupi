import { db } from "@workspace/db";
import { pushTokensTable, usersTable, agendamentosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
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
      console.log(`[Push] Web push tokens found for user ${userId}, but web push is not yet configured. ${webPushTokens.length} token(s) skipped.`);
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

    for (const userId of allUserIds) {
      await sendPushToUser(userId, message);
    }
  } catch (err) {
    console.error(`[Push] Error sending push to barbearia ${barbeariaId}:`, err);
  }
}

async function sendExpoPush(tokens: string[], message: PushMessage): Promise<void> {
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
    } else {
      const result = await response.json();
      console.log(`[Push] Expo push sent to ${tokens.length} token(s):`, JSON.stringify(result.data?.map?.((d: any) => d.status) || []));
    }
  } catch (err) {
    console.error("[Push] Error sending Expo push:", err);
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
          data: { agendamentoId: agend.id, type: "reminder" },
        });
      }
    }
  } catch (err) {
    console.error("[Push] Error sending reminders:", err);
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
  }, 5 * 60 * 1000);

  sendAgendamentoReminders().catch(err =>
    console.error("[Push] Initial reminder check error:", err)
  );
}
