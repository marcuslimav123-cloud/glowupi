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
}

createRoot(document.getElementById("root")!).render(<App />);
