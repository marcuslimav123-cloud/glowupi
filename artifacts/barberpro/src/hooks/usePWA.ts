import { useEffect, useRef } from "react";

interface PWAOptions {
  slug: string | undefined;
  nome: string | undefined;
  logoUrl: string | null | undefined;
  corPrimaria: string | undefined;
  startUrl?: string;
}

function toAbsoluteIconUrl(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    return new URL(trimmed, window.location.origin).href;
  } catch {
    return fallback;
  }
}

export function usePWA({ slug, nome, logoUrl, corPrimaria, startUrl }: PWAOptions) {
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug || startUrl) return;

    try {
      const basePath = import.meta.env.BASE_URL || "/";
      const API_BASE = `${basePath}api`.replace(/\/+/g, "/");
      const manifestUrl = `${API_BASE}/public/${slug}/manifest.json`;

      let manifestLink = document.querySelector<HTMLLinkElement>(
        'link[rel="manifest"]'
      );
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

  useEffect(() => {
    if (slug && !startUrl) return;
    if (!nome) return;

    try {
      const basePath = import.meta.env.BASE_URL || "/";
      const fallbackIcon = toAbsoluteIconUrl(
        `${basePath}logo-icon.png`,
        `${window.location.origin}/logo-icon.png`,
      );

      const iconUrl = toAbsoluteIconUrl(logoUrl, fallbackIcon);
      const usingCustom = !!logoUrl && iconUrl !== fallbackIcon;

      const icons: { src: string; sizes: string; type?: string; purpose: string }[] = [];
      if (usingCustom) {
        icons.push(
          { src: iconUrl, sizes: "192x192", purpose: "any" },
          { src: iconUrl, sizes: "512x512", purpose: "any" },
          { src: iconUrl, sizes: "192x192", purpose: "maskable" },
          { src: iconUrl, sizes: "512x512", purpose: "maskable" },
        );
      } else {
        icons.push(
          { src: fallbackIcon, sizes: "192x192", type: "image/png", purpose: "any" },
        );
      }

      const manifest = {
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

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const blob = new Blob([JSON.stringify(manifest)], {
        type: "application/manifest+json",
      });
      blobUrlRef.current = URL.createObjectURL(blob);

      let manifestLink = document.querySelector<HTMLLinkElement>(
        'link[rel="manifest"]'
      );
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
      } catch (err) { console.warn("[barberpro] safe-catch:", err); }
    };
  }, [slug, nome, logoUrl, corPrimaria, startUrl]);

  useEffect(() => {
    try {
      const basePath = import.meta.env.BASE_URL || "/";
      const fallbackIcon = toAbsoluteIconUrl(
        `${basePath}logo-icon.png`,
        `${window.location.origin}/logo-icon.png`,
      );
      const iconUrl = toAbsoluteIconUrl(logoUrl, fallbackIcon);

      let appleTouchIcon = document.querySelector<HTMLLinkElement>(
        'link[rel="apple-touch-icon"]'
      );
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement("link");
        appleTouchIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = iconUrl;

      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) {
        favicon.href = iconUrl;
      }
    } catch (err) {
      console.warn("[usePWA] erro ao atualizar favicon/apple-touch-icon:", err);
    }
  }, [logoUrl]);

  useEffect(() => {
    if (!corPrimaria) return;
    try {
      const themeColor = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]'
      );
      if (themeColor) {
        themeColor.content = corPrimaria;
      }
    } catch (err) { console.warn("[barberpro] safe-catch:", err); }
  }, [corPrimaria]);

  useEffect(() => {
    if (!nome) return;

    try {
      let appleTitle = document.querySelector<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-title"]'
      );
      if (!appleTitle) {
        appleTitle = document.createElement("meta");
        appleTitle.name = "apple-mobile-web-app-title";
        document.head.appendChild(appleTitle);
      }
      appleTitle.content = nome;
      document.title = nome;
    } catch (err) { console.warn("[barberpro] safe-catch:", err); }

    return () => {
      try {
        const amt = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (amt) amt.remove();
      } catch (err) { console.warn("[barberpro] safe-catch:", err); }
    };
  }, [nome]);
}
