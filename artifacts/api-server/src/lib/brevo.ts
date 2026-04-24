import nodemailer from "nodemailer";

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const GMAIL_USER = process.env.GMAIL_USER || "marcuslimav123@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const BREVO_API_URL = "https://api.brevo.com/v3";

const gmailTransporter = GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
  tags?: string[];
  preferProvider?: "brevo" | "gmail";
}

type SendResult = { success: boolean; messageId?: string; error?: string; provider?: "brevo" | "gmail" };

async function sendViaBrevo(params: SendEmailParams): Promise<SendResult> {
  const body: any = {
    sender: params.sender || { name: "Glow Upi", email: "marcuslimav123@gmail.com" },
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
  };
  if (params.tags?.length) body.tags = params.tags;

  const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[Brevo] API error ${res.status}:`, errBody);
    return { success: false, error: `Brevo API ${res.status}: ${errBody}`, provider: "brevo" };
  }

  const data = await res.json();
  console.log(`[Brevo] Email sent to ${params.to.map(r => r.email).join(", ")}, messageId=${data.messageId}`);
  return { success: true, messageId: data.messageId, provider: "brevo" };
}

async function sendViaGmail(params: SendEmailParams): Promise<SendResult> {
  if (!gmailTransporter) {
    return { success: false, error: "Gmail SMTP não configurado", provider: "gmail" };
  }
  const senderName = params.sender?.name || "Glow Upi";
  const recipients = params.to.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email).join(", ");
  const info = await gmailTransporter.sendMail({
    from: `"${senderName}" <${GMAIL_USER}>`,
    to: recipients,
    subject: params.subject,
    html: params.htmlContent,
  });
  console.log(`[Gmail] Email sent to ${recipients}, messageId=${info.messageId}`);
  return { success: true, messageId: info.messageId, provider: "gmail" };
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  try {
    if (params.preferProvider === "gmail") {
      const gmailResult = await sendViaGmail(params);
      if (!gmailResult.success) {
        console.error("[Email] Gmail (forced for marketing/individual) failed — NOT falling back to Brevo to avoid DMARC/SPF break:", gmailResult.error);
      }
      return gmailResult;
    }

    if (BREVO_API_KEY) {
      const result = await sendViaBrevo(params);
      if (result.success) return result;
      console.warn("[Email] Brevo failed, trying Gmail fallback:", result.error);
    }

    return await sendViaGmail(params);
  } catch (err: any) {
    console.error(`[Email] All providers failed:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function addBrevoContact(email: string, attributes?: Record<string, any>, listIds?: number[]): Promise<{ success: boolean; error?: string }> {
  if (!BREVO_API_KEY) return { success: false, error: "Brevo API key not configured" };

  const body: any = { email };
  if (attributes) body.attributes = attributes;
  if (listIds?.length) body.listIds = listIds;
  body.updateEnabled = true;

  const res = await fetch(`${BREVO_API_URL}/contacts`, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 204) {
    const errBody = await res.text();
    console.error(`[Brevo] Contact error ${res.status}:`, errBody);
    return { success: false, error: errBody };
  }

  console.log(`[Brevo] Contact added/updated: ${email}`);
  return { success: true };
}

export async function getBrevoLists(): Promise<any[]> {
  if (!BREVO_API_KEY) return [];
  const res = await fetch(`${BREVO_API_URL}/contacts/lists?limit=50&offset=0`, {
    headers: { "api-key": BREVO_API_KEY, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.lists || [];
}

export async function getEmailStats() {
  if (BREVO_API_KEY) {
    try {
      const res = await fetch(`${BREVO_API_URL}/account`, {
        headers: { "api-key": BREVO_API_KEY, Accept: "application/json" },
      });
      if (res.ok) {
        const account = await res.json();
        const plan = account.plan?.[0] || {};
        return {
          dia: new Date().toISOString().split("T")[0],
          total: plan.credits ?? 0,
          limite: plan.creditsType === "sendLimit" ? plan.credits : 300,
          contas: [
            { provider: "Brevo API", status: "active", email: account.email },
            ...(GMAIL_APP_PASSWORD ? [{ provider: "Gmail SMTP (fallback)", status: "configured" }] : []),
          ],
        };
      }
    } catch {}
  }

  return {
    dia: new Date().toISOString().split("T")[0],
    total: 0,
    limite: 500,
    contas: [
      { provider: "Brevo API", status: BREVO_API_KEY ? "configured" : "missing key" },
      { provider: "Gmail SMTP", status: GMAIL_APP_PASSWORD ? "configured" : "missing password" },
    ],
  };
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
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;">Glow Upi</h1>
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
      <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.25);">Glow Upi — Organize sua agenda e fidelize suas clientes</p>
    </div>
  </div>
</body>
</html>`;
}
