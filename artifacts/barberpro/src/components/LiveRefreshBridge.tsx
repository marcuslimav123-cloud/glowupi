import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LIVE_REFRESH_EVENT, LIVE_REFRESH_INTERVAL_MS, triggerLiveRefresh } from "@/lib/liveRefresh";

// Chaves de consulta que mudam com o dia a dia e merecem o tique de 1 minuto.
const OPERACIONAIS = ["agendamentos", "comandas", "dashboard", "caixa", "pendentes", "inbox", "notific", "mensagens", "lista-espera", "sugeridas"];

function chaveOperacional(key: readonly unknown[]): boolean {
  return key.some(k => typeof k === "string" && OPERACIONAIS.some(o => k.toLowerCase().includes(o)));
}

export function LiveRefreshBridge() {
  const qc = useQueryClient();

  useEffect(() => {
    // 1) Quem pediu atualização (push, foco, intervalo ou ação local) invalida as consultas.
    const onRefresh = (e: Event) => {
      const reason = (e as CustomEvent).detail?.reason;
      if (reason === "interval") {
        qc.invalidateQueries({ predicate: q => chaveOperacional(q.queryKey) });
      } else {
        qc.invalidateQueries();
      }
    };
    window.addEventListener(LIVE_REFRESH_EVENT, onRefresh);

    // 2) Notificação push chegou: o service worker avisa a aba.
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_RECEIVED") triggerLiveRefresh("push", event.data.data);
    };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onSwMessage);

    // 3) Voltou para a aba ou para o aplicativo.
    const onVisible = () => { if (document.visibilityState === "visible") triggerLiveRefresh("focus"); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    // 4) Tique de garantia enquanto a tela está visível.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") triggerLiveRefresh("interval");
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener(LIVE_REFRESH_EVENT, onRefresh);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onSwMessage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      window.clearInterval(timer);
    };
  }, [qc]);

  return null;
}
