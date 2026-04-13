import { useState, useEffect, useRef, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPWA() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const globalPrompt = (window as any).__pwaInstallPrompt;
    if (globalPrompt) {
      deferredPrompt.current = globalPrompt as BeforeInstallPromptEvent;
      setCanInstall(true);
      (window as any).__pwaInstallPrompt = null;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt.current) {
      try {
        await deferredPrompt.current.prompt();
        const { outcome } = await deferredPrompt.current.userChoice;
        deferredPrompt.current = null;
        (window as any).__pwaInstallPrompt = null;
        if (outcome === "accepted") {
          setCanInstall(false);
          setIsInstalled(true);
          return true;
        }
      } catch {
        deferredPrompt.current = null;
      }
      return false;
    }
    return false;
  }, []);

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);

  return {
    canInstall,
    isInstalled,
    install,
    showIOSInstructions: isIOS && !isInstalled,
    isIOS,
    isSafari,
    isAndroid,
  };
}
