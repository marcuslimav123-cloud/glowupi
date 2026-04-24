import React from "react";

interface State {
  hasError: boolean;
}

export class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || "";
    const name = error?.name || "";
    const isChunkError =
      name === "ChunkLoadError" ||
      /Loading chunk \d+ failed/i.test(msg) ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Importing a module script failed/i.test(msg) ||
      /error loading dynamically imported module/i.test(msg);

    if (isChunkError) {
      const reloadKey = "__chunk_reload_at";
      const last = Number(sessionStorage.getItem(reloadKey) || "0");
      const now = Date.now();
      if (now - last > 30000) {
        sessionStorage.setItem(reloadKey, String(now));
        ChunkErrorBoundary.nukeAndReload();
        return { hasError: true };
      }
    }
    return { hasError: true };
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
    sessionStorage.removeItem("__chunk_reload_at");
    await ChunkErrorBoundary.nukeAndReload();
  };

  componentDidCatch(error: Error) {
    console.error("[ChunkErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">Algo deu errado.</h1>
            <p className="text-sm text-muted-foreground">
              Tente recarregar a página.
            </p>
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
