import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
});

if ("serviceWorker" in navigator) {
  const basePath = import.meta.env.BASE_URL || "/";
  navigator.serviceWorker
    .register(`${basePath}sw.js`, { scope: basePath, updateViaCache: "none" })
    .then((reg) => {
      console.log("[SW] Service Worker registered, scope:", reg.scope);
      reg.update().catch(() => {});
    })
    .catch((err) => {
      console.error("[SW] Service Worker registration failed:", err);
    });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_ACTIVATED") {
      const reloadKey = "__sw_reload_v";
      const lastVersion = sessionStorage.getItem(reloadKey);
      if (lastVersion !== event.data.version) {
        sessionStorage.setItem(reloadKey, event.data.version);
        console.log("[SW] New service worker activated, reloading with cache bust");
        try {
          const url = new URL(window.location.href);
          url.searchParams.set("_swv", String(Date.now()));
          window.location.replace(url.toString());
        } catch {
          window.location.reload();
        }
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
