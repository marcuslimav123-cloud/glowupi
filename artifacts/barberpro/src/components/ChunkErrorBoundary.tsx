import React from "react";

interface State {
  hasError: boolean;
  message: string;
}

const RELOAD_KEY = "__chunk_reload_at";
const RELOAD_DEBOUNCE_MS = 30000;

function isChunkLoadError(error: Error | null | undefined): boolean {
  if (!error) return false;
  const msg = error.message || "";
  const name = error.name || "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

function shortMessage(error: Error | null | undefined): string {
  const raw = error?.message || error?.name || "Erro desconhecido";
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 200) return trimmed;
  return trimmed.slice(0, 197) + "...";
}

export class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    if (isChunkLoadError(error)) {
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
        const now = Date.now();
        if (now - last > RELOAD_DEBOUNCE_MS) {
          sessionStorage.setItem(RELOAD_KEY, String(now));
          ChunkErrorBoundary.nukeAndReload();
        }
      } catch {}
    }
    return { hasError: true, message: shortMessage(error) };
  }

  static async nukeAndReload() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("_cb", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }

  handleManualRecover = async () => {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {}
    await ChunkErrorBoundary.nukeAndReload();
  };

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      console.error("[ChunkErrorBoundary] erro capturado:", error);
      if (info?.componentStack) {
        console.error("[ChunkErrorBoundary] componentStack:", info.componentStack);
      }
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="space-y-4 max-w-md">
            <h1 className="text-xl font-semibold">Algo deu errado.</h1>
            <p className="text-sm text-muted-foreground">
              Tente recarregar a página. Se continuar, tire um print desta tela e
              envie para o suporte.
            </p>
            {this.state.message && (
              <pre className="text-[11px] text-left text-muted-foreground/80 bg-muted/40 border border-border rounded-lg p-3 whitespace-pre-wrap break-words max-h-40 overflow-auto">
                {this.state.message}
              </pre>
            )}
            <button
              onClick={this.handleManualRecover}
              className="bg-primary text-black font-bold px-6 py-3 rounded-xl"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
