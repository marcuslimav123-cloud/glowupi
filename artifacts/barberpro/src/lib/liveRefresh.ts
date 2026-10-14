import { useEffect, useRef } from "react";

// Atualização automática dos dados do painel.
//
// Dispara em três situações: quando chega uma notificação push (o service
// worker avisa a aba), quando a pessoa volta para a aba/aplicativo e, por
// garantia, a cada minuto enquanto a tela está visível. As páginas que usam
// react-query são invalidadas pelo LiveRefreshBridge; páginas com fetch
// manual usam o hook useLiveRefresh.

export const LIVE_REFRESH_EVENT = "glowupi:refresh";
export const LIVE_REFRESH_INTERVAL_MS = 60_000;

export type LiveRefreshReason = "push" | "focus" | "interval" | "local";

export function triggerLiveRefresh(reason: LiveRefreshReason = "local", detail?: unknown) {
  try {
    window.dispatchEvent(new CustomEvent(LIVE_REFRESH_EVENT, { detail: { reason, detail } }));
  } catch {}
}

/** Executa `fn` sempre que o painel pedir atualização. */
export function useLiveRefresh(fn: (reason: LiveRefreshReason) => void, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (e: Event) => {
      const reason = ((e as CustomEvent).detail?.reason as LiveRefreshReason) || "local";
      ref.current(reason);
    };
    window.addEventListener(LIVE_REFRESH_EVENT, handler);
    return () => window.removeEventListener(LIVE_REFRESH_EVENT, handler);
  }, [enabled]);
}
