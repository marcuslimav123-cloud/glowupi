export function normalizePhoneForWhatsapp(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return "55" + digits;
}

export function buildWhatsappUrl(phone: string | null | undefined, message: string): string {
  const normalized = normalizePhoneForWhatsapp(phone);
  const encoded = encodeURIComponent(message || "");
  return `https://wa.me/${normalized}${encoded ? `?text=${encoded}` : ""}`;
}

export function renderWhatsappTemplate(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function formatDateBR(dateIso: string): string {
  if (!dateIso) return "";
  const d = new Date(dateIso + "T12:00:00");
  if (isNaN(d.getTime())) return dateIso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
