import { db } from "@workspace/db";
import { brevoEmailLogTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const BREVO_KEYS = [
  process.env.BREVO_API_KEY_1,
  process.env.BREVO_API_KEY_2,
  process.env.BREVO_API_KEY_3,
  process.env.BREVO_API_KEY_4,
].filter(Boolean) as string[];

let currentIndex = 0;

function getNextKey(): { key: string; index: number } {
  if (BREVO_KEYS.length === 0) throw new Error("Nenhuma chave Brevo configurada");
  const index = currentIndex % BREVO_KEYS.length;
  currentIndex++;
  return { key: BREVO_KEYS[index], index: index + 1 };
}

async function incrementEmailCount(keyIndex: number) {
  const today = new Date().toISOString().split("T")[0];
  const [existing] = await db
    .select()
    .from(brevoEmailLogTable)
    .where(and(eq(brevoEmailLogTable.keyIndex, keyIndex), eq(brevoEmailLogTable.dia, today)))
    .limit(1);

  if (existing) {
    await db
      .update(brevoEmailLogTable)
      .set({ contagem: sql`${brevoEmailLogTable.contagem} + 1`, updatedAt: new Date() })
      .where(eq(brevoEmailLogTable.id, existing.id));
  } else {
    await db.insert(brevoEmailLogTable).values({ keyIndex, dia: today, contagem: 1 });
  }
}

export async function getEmailStats() {
  const today = new Date().toISOString().split("T")[0];
  const logs = await db
    .select()
    .from(brevoEmailLogTable)
    .where(eq(brevoEmailLogTable.dia, today));

  const stats = BREVO_KEYS.map((_, i) => {
    const log = logs.find(l => l.keyIndex === i + 1);
    return { keyIndex: i + 1, contagem: log?.contagem || 0 };
  });

  const total = stats.reduce((sum, s) => sum + s.contagem, 0);
  return { dia: today, total, limite: BREVO_KEYS.length * 300, contas: stats };
}

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { key, index } = getNextKey();
  const sender = params.sender || { name: "Glow Agenda", email: process.env.BREVO_SENDER_EMAIL || "marcuslimav123@gmail.com" };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": key,
      },
      body: JSON.stringify({
        sender,
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`Brevo key ${index} error:`, data);
      return { success: false, error: data.message || "Erro ao enviar e-mail" };
    }

    await incrementEmailCount(index);
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    console.error(`Brevo send error (key ${index}):`, err);
    return { success: false, error: err.message };
  }
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export function buildInviteEmailHtml(params: {
  nomeEstabelecimento: string;
  nomeConvidado?: string;
  role: string;
  link: string;
}): string {
  const roleLabel = params.role === "gerente" ? "Gerente" : "Colaborador(a)";
  const greeting = params.nomeConvidado ? `Olá, ${params.nomeConvidado}!` : "Olá!";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#fafafa;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;">
    <div style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(196,164,106,0.08),rgba(196,164,106,0.02));">
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;">Glow Agenda</h1>
      <p style="margin:0;font-size:13px;color:rgba(0,0,0,0.4);">Convite para equipe</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px;">${greeting}</p>
      <p style="font-size:14px;color:rgba(0,0,0,0.6);line-height:1.6;margin:0 0 24px;">
        Você foi convidado(a) para fazer parte da equipe de <strong>${params.nomeEstabelecimento}</strong> como <strong>${roleLabel}</strong>.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${params.link}" style="display:inline-block;padding:12px 32px;background:#c4a46a;color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
          Aceitar Convite
        </a>
      </div>
      <p style="font-size:12px;color:rgba(0,0,0,0.3);text-align:center;margin:24px 0 0;">
        Este convite expira em 7 dias. Se o botão não funcionar, copie e cole este link no navegador:<br>
        <span style="color:rgba(0,0,0,0.5);word-break:break-all;">${params.link}</span>
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.25);">Glow Agenda — Organize sua agenda e fidelize suas clientes</p>
    </div>
  </div>
</body>
</html>`;
}
