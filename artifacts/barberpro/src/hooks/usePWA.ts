import { useEffect, useRef } from "react";

interface PWAOptions {
  slug: string | undefined;
  nome: string | undefined;
  logoUrl: string | null | undefined;
  corPrimaria: string | undefined;
}

export function usePWA({ slug, nome, logoUrl, corPrimaria }: PWAOptions) {
  const swRegistered = useRef(false);

  useEffect(() => {
    if (!slug) return;

    if ("serviceWorker" in navigator && !swRegistered.current) {
      const basePath = import.meta.env.BASE_URL || "/";
      navigator.serviceWorker.register(`${basePath}sw.js`).catch(() => {});
      swRegistered.current = true;
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");
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

    return () => {
      const ml = document.querySelector('link[rel="manifest"]');
      if (ml) ml.remove();
    };
  }, [slug]);

  useEffect(() => {
    if (!logoUrl) return;

    let appleTouchIcon = document.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]'
    );
    if (!appleTouchIcon) {
      appleTouchIcon = document.createElement("link");
      appleTouchIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleTouchIcon);
    }
    appleTouchIcon.href = logoUrl;

    return () => {
      const ati = document.querySelector('link[rel="apple-touch-icon"]');
      if (ati) ati.remove();
    };
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
