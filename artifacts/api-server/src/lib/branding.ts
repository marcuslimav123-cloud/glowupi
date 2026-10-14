// Identidade visual padrão do Glow Upi, escolhida pelo tipo de estabelecimento
// informado no onboarding (segmentacao.tipoEstabelecimento). Barbearias usam a
// marca masculina; os demais segmentos usam a marca oficial.

export function tipoEstabelecimentoDe(seg: unknown): string | null {
  if (typeof seg === "string") return seg;
  const tipo = (seg as { tipoEstabelecimento?: unknown } | null | undefined)?.tipoEstabelecimento;
  return typeof tipo === "string" ? tipo : null;
}

export function isBarbearia(seg: unknown): boolean {
  return /barbearia/i.test(tipoEstabelecimentoDe(seg) ?? "");
}

export function brandKey(seg: unknown): "barbearia" | "glowupi" {
  return isBarbearia(seg) ? "barbearia" : "glowupi";
}

export function defaultLogoPath(seg: unknown, basePath = "/"): string {
  return `${basePath}/${isBarbearia(seg) ? "logo-barbearia.png" : "logo-icon.png"}`.replace(/\/+/g, "/");
}

export function defaultIconPath(seg: unknown, size: 192 | 512, basePath = "/"): string {
  return `${basePath}/icons/${brandKey(seg)}-${size}.png`.replace(/\/+/g, "/");
}
