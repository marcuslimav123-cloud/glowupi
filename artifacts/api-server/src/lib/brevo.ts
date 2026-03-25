import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER || "marcuslimav123@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

interface SendEmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!GMAIL_APP_PASSWORD) {
    console.error("[Email] GMAIL_APP_PASSWORD not configured");
    return { success: false, error: "Senha de app do Gmail não configurada" };
  }

  const senderName = params.sender?.name || "Glow Up";
  const recipients = params.to.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email).join(", ");

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${GMAIL_USER}>`,
      to: recipients,
      subject: params.subject,
      html: params.htmlContent,
    });

    console.log(`[Email] Sent to ${recipients}, messageId=${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${recipients}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function getEmailStats() {
  return {
    dia: new Date().toISOString().split("T")[0],
    total: 0,
    limite: 500,
    contas: [{ provider: "Gmail SMTP", status: GMAIL_APP_PASSWORD ? "configured" : "missing password" }],
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
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;">Glow Up</h1>
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
      <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.25);">Glow Up — Organize sua agenda e fidelize suas clientes</p>
    </div>
  </div>
</body>
</html>`;
}
