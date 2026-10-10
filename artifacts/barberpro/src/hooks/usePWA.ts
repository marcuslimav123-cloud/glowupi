import { useEffect, useRef } from "react";
import { defaultIconUrl, defaultLogoUrl } from "@/lib/branding";

interface PWAOptions {
  slug: string | undefined;
  nome: string | undefined;
  logoUrl: string | null | undefined;
  corPrimaria: string | undefined;
  startUrl?: string;
  /** Tipo de estabelecimento (ou objeto segmentacao) para escolher a marca padrão. */
  tipoEstabelecimento?: string | { tipoEstabelecimento?: string | null } | null;
}

function toAbsoluteUrl(raw: string | null | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    return new URL(trimmed, window.location.origin).href;
  } catch {
    return fallback;
  }
}

function apiBase(): string {
  const basePath = import.meta.env.BASE_URL || "/";
  return `${basePath}api`.replace(/\/+/g, "/");
}

export function usePWA({ slug, nome, logoUrl, corPrimaria, startUrl, tipoEstabelecimento }: PWAOptions) {
  const blobUrlRef = useRef<string | null>(null);
  const brand = tipoEstabelecimento ?? null;

  // Com slug conhecido, o manifest vem do servidor: ele já traz ícones PNG
  // quadrados (logo do dono convertida, ou a marca padrão do segmento), que é
  // o que o Android exige para instalar o app com o ícone certo.
  useEffect(() => {
    if (!slug) return;
    try {
      const manifestUrl = `${apiBase()}/public/${slug}/manifest.json${startUrl ? "?modo=painel" : ""}`;
      let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (!manifestLink) {
        manifestLink = document.createElement("link");
        manifestLink.rel = "manifest";
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = manifestUrl;
    } catch (err) {
      console.warn("[usePWA] erro ao apontar manifest publico:", err);
    }
  }, [slug, startUrl]);

  // Sem slug (caso raro), gera um manifest local com a marca padrão.
  useEffect(() => {
    if (slug || !nome) return;

    try {
      const basePath = import.meta.env.BASE_URL || "/";
      const icons = ([192, 512] as const).flatMap((size) => {
        const src = toAbsoluteUrl(defaultIconUrl(brand, size), `${window.location.origin}/icons/glowupi-${size}.png`);
        return [
          { src, sizes: `${size}x${size}`, type: "image/png", purpose: "any" },
          { src, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" },
        ];
      });

      const manifest = {
        id: startUrl || basePath,
        name: nome,
        short_name: nome.length > 12 ? nome.slice(0, 12) : nome,
        description: `Painel - ${nome}`,
        start_url: startUrl || basePath,
        scope: basePath,
        display: "standalone",
        background_color: "#111111",
        theme_color: corPrimaria || "#C4943C",
        icons,
      };

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
      blobUrlRef.current = URL.createObjectURL(blob);

      let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (!manifestLink) {
        manifestLink = document.createElement("link");
        manifestLink.rel = "manifest";
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = blobUrlRef.current;
    } catch (err) {
      console.warn("[usePWA] erro ao gerar manifest dinamico:", err);
    }

    return () => {
      try {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      } catch {}
    };
  }, [slug, nome, corPrimaria, startUrl, brand]);

  // Favicon e ícone do iOS (apple-touch-icon). O iOS ignora o manifest e usa
  // este link, por isso ele também aponta para o PNG gerado no servidor.
  useEffect(() => {
    try {
      const defaultLogo = toAbsoluteUrl(defaultLogoUrl(brand), `${window.location.origin}/logo-icon.png`);
      const defaultIcon = toAbsoluteUrl(defaultIconUrl(brand, 192), `${window.location.origin}/icons/glowupi-192.png`);
      const faviconUrl = toAbsoluteUrl(logoUrl, defaultLogo);
      const touchIconUrl = logoUrl && slug
        ? toAbsoluteUrl(`${apiBase()}/public/${slug}/icon-192.png`, defaultIcon)
        : logoUrl
          ? toAbsoluteUrl(logoUrl, defaultIcon)
          : defaultIcon;

      let appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement("link");
        appleTouchIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = touchIconUrl;

      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) favicon.href = faviconUrl;
    } catch (err) {
      console.warn("[usePWA] erro ao atualizar favicon/apple-touch-icon:", err);
    }
  }, [logoUrl, slug, brand]);

  useEffect(() => {
    if (!corPrimaria) return;
    try {
      const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (themeColor) themeColor.content = corPrimaria;
    } catch {}
  }, [corPrimaria]);

  useEffect(() => {
    if (!nome) return;

    try {
      let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
      if (!appleTitle) {
        appleTitle = document.createElement("meta");
        appleTitle.name = "apple-mobile-web-app-title";
        document.head.appendChild(appleTitle);
      }
      appleTitle.content = nome;
      document.title = nome;
    } catch {}

    return () => {
      try {
        const amt = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (amt) amt.remove();
      } catch {}
    };
  }, [nome]);
}
