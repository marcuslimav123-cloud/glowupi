import { useEffect, useRef } from "react";

interface PWAOptions {
  slug: string | undefined;
  nome: string | undefined;
  logoUrl: string | null | undefined;
  corPrimaria: string | undefined;
  startUrl?: string;
}

export function usePWA({ slug, nome, logoUrl, corPrimaria, startUrl }: PWAOptions) {
  const swRegistered = useRef(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug && !nome) return;

    if ("serviceWorker" in navigator && !swRegistered.current) {
      const basePath = import.meta.env.BASE_URL || "/";
      navigator.serviceWorker.register(`${basePath}sw.js`).catch(() => {});
      swRegistered.current = true;
    }
  }, [slug, nome]);

  useEffect(() => {
    if (!nome) return;

    const basePath = import.meta.env.BASE_URL || "/";

    let manifestLink = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]'
    );
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }

    if (slug && !startUrl) {
      const API_BASE = `${basePath}api`.replace(/\/+/g, "/");
      const manifestUrl = `${API_BASE}/public/${slug}/manifest.json`;
      manifestLink.href = manifestUrl;
    } else {
      const icons: { src: string; sizes: string; type?: string; purpose: string }[] = [];
      if (logoUrl) {
        icons.push(
          { src: logoUrl, sizes: "192x192", purpose: "any" },
          { src: logoUrl, sizes: "512x512", purpose: "any" },
          { src: logoUrl, sizes: "192x192", purpose: "maskable" },
          { src: logoUrl, sizes: "512x512", purpose: "maskable" },
        );
      } else {
        icons.push(
          { src: `${basePath}logo-icon.png`, sizes: "192x192", type: "image/png", purpose: "any" },
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
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
      blobUrlRef.current = URL.createObjectURL(blob);
      manifestLink.href = blobUrlRef.current;
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [slug, nome, logoUrl, corPrimaria, startUrl]);

  useEffect(() => {
    const iconUrl = logoUrl || `${import.meta.env.BASE_URL || "/"}logo-icon.png`;

    let appleTouchIcon = document.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]'
    );
    if (!appleTouchIcon) {
      appleTouchIcon = document.createElement("link");
      appleTouchIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleTouchIcon);
    }
    appleTouchIcon.href = iconUrl;

    let favicon = document.querySelector<HTMLLinkElement>(
      'link[rel="icon"]'
    );
    if (favicon) {
      favicon.href = iconUrl;
    }
  }, [logoUrl]);

  useEffect(() => {
    if (!corPrimaria) return;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (themeColor) {
      themeColor.content = corPrimaria;
    }
  }, [corPrimaria]);

  useEffect(() => {
    if (!nome) return;

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

    return () => {
      const amt = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (amt) amt.remove();
    };
  }, [nome]);
}
