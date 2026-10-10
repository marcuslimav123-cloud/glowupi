// Identidade visual padrão do Glow Upi, escolhida pelo tipo de estabelecimento
// informado no onboarding. Barbearias usam a marca masculina; os demais
// segmentos usam a marca oficial. Vale para os lugares onde a logo do sistema
// aparece enquanto o dono não envia a logo própria (painel, página pública,
// ícone do app instalado).

export const TIPOS_ESTABELECIMENTO = [
  "Barbearia", "Salão de Beleza", "Clínica de Estética", "Studio de Sobrancelhas",
  "Studio de Maquiagem", "Extensão de Cílios", "Esmalteria",
  "Studio de Tatuagem", "Outro",
];

type SegmentoLike = string | { tipoEstabelecimento?: string | null } | null | undefined;

function tipoDe(seg: SegmentoLike): string {
  if (typeof seg === "string") return seg;
  return seg?.tipoEstabelecimento ?? "";
}

export function isBarbearia(seg: SegmentoLike): boolean {
  return /barbearia/i.test(tipoDe(seg));
}

function basePath(): string {
  return import.meta.env.BASE_URL || "/";
}

export function defaultLogoUrl(seg: SegmentoLike): string {
  return `${basePath()}/${isBarbearia(seg) ? "logo-barbearia.png" : "logo-icon.png"}`.replace(/\/+/g, "/");
}

export function defaultIconUrl(seg: SegmentoLike, size: 192 | 512 = 192): string {
  return `${basePath()}/icons/${isBarbearia(seg) ? "barbearia" : "glowupi"}-${size}.png`.replace(/\/+/g, "/");
}
