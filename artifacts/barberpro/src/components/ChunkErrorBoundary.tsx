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
      /Importing a module script failed/i.test(msg);

    if (isChunkError) {
      const reloadKey = "__chunk_reload_at";
      const last = Number(sessionStorage.getItem(reloadKey) || "0");
      const now = Date.now();
      if (now - last > 5000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return { hasError: true };
      }
    }
    return { hasError: true };
  }

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
              onClick={() => window.location.reload()}
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
