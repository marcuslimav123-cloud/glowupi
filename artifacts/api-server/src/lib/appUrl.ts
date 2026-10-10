// URL pública do app, usada para montar links em e-mails, webhooks e redirects.
// Prioridade: APP_BASE_URL (produção na VPS) → domínios do Replit (dev) →
// host da requisição, quando informado → domínio oficial.
export function getAppBaseUrl(fallbackHost?: string | null): string {
  const explicit =
    process.env.APP_BASE_URL || process.env.PUBLIC_URL || process.env.PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const replitDomain =
    process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
  if (replitDomain) return `https://${replitDomain}`;

  if (fallbackHost) return `https://${fallbackHost}`;

  return "https://glowupi.com.br";
}
