import crypto from "node:crypto";
import { sendEmail, renderTemplate } from "./brevo.js";

const PUBLIC_BASE = process.env.REPLIT_DOMAINS
  ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
  : (process.env.PUBLIC_APP_URL || "");

export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildUnsubscribeUrl(token: string): string {
  const base = PUBLIC_BASE || "";
  return `${base}/api/email-marketing/unsubscribe/${token}`;
}

export function buildAgendamentoUrl(barbeariaSlug: string | null | undefined): string {
  const base = PUBLIC_BASE || "";
  if (!barbeariaSlug) return base + "/barberpro/";
  return `${base}/barberpro/agendar/${barbeariaSlug}`;
}

export function buildUnsubscribeFooter(nomeEstabelecimento: string, unsubscribeUrl: string): string {
  return `
    <hr style="margin:32px 0 16px;border:none;border-top:1px solid rgba(0,0,0,0.08);">
    <p style="font-size:11px;color:rgba(0,0,0,0.5);text-align:center;line-height:1.6;font-family:Arial,sans-serif;">
      Você está recebendo este e-mail porque é cliente de <strong>${escapeHtml(nomeEstabelecimento)}</strong>.<br>
      Não quer mais receber? <a href="${unsubscribeUrl}" style="color:#c4a46a;text-decoration:underline;">Descadastrar</a>
    </p>
  `;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

export function renderMarketingBody(corpo: string, vars: Record<string, string>): string {
  const looksLikeHtml = /<\/?(p|div|br|html|body|h[1-6]|table|span|a)\b/i.test(corpo);
  const html = looksLikeHtml ? corpo : `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;white-space:pre-wrap;">${escapeHtml(corpo).replace(/\n/g, "<br>")}</div>`;
  return renderTemplate(html, vars);
}

export interface SendMarketingParams {
  to: { email: string; name?: string };
  assunto: string;
  bodyHtml: string;
  nomeEstabelecimento: string;
  unsubscribeUrl: string;
  senderEmail?: string;
}

export async function sendMarketingEmail(params: SendMarketingParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fullHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.06);padding:32px;">
    ${params.bodyHtml}
    ${buildUnsubscribeFooter(params.nomeEstabelecimento, params.unsubscribeUrl)}
  </div>
</body>
</html>`;
  return sendEmail({
    to: [params.to],
    subject: params.assunto,
    htmlContent: fullHtml,
    sender: { name: params.nomeEstabelecimento, email: params.senderEmail || "marcuslimav123@gmail.com" },
    tags: ["email_marketing"],
  });
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
