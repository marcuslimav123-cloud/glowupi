import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Appearance } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getItem, setItem } from "@/lib/storage";
import { fetchJson, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export type ThemeMode = "claro" | "escuro" | "auto";
export type Resolved = "claro" | "escuro";

export const darkColors = {
  background: "#0f0f0f",
  surface: "#1a1a1a",
  surfaceLight: "#242424",
  surfaceBorder: "#2a2a2a",
  accent: "#c4a46a",
  accentDark: "#a88a50",
  accentLight: "#d4b87a",
  text: "#ffffff",
  textSecondary: "#999999",
  textMuted: "#666666",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  tabActive: "#c4a46a",
  tabInactive: "#666666",
  overlay: "rgba(0,0,0,0.55)",
  shadow: "rgba(0,0,0,0.35)",
  invertedText: "#0f0f0f",
};

export const lightColors: typeof darkColors = {
  background: "#f7f7f8",
  surface: "#ffffff",
  surfaceLight: "#f1f1f3",
  surfaceBorder: "#e5e5e9",
  accent: "#a07a3a",
  accentDark: "#7d5d27",
  accentLight: "#c4a46a",
  text: "#161618",
  textSecondary: "#52525b",
  textMuted: "#a1a1aa",
  success: "#15803d",
  error: "#dc2626",
  warning: "#b45309",
  info: "#1d4ed8",
  tabActive: "#a07a3a",
  tabInactive: "#a1a1aa",
  overlay: "rgba(0,0,0,0.35)",
  shadow: "rgba(0,0,0,0.08)",
  invertedText: "#ffffff",
};

export type ColorPalette = typeof darkColors;

const THEME_KEY = "glow_upi_theme_mode";

const TEMA_LAYOUT_TO_MODE: Record<string, ThemeMode> = {
  Claro: "claro",
  Escuro: "escuro",
  "Automático": "auto",
  Automatico: "auto",
};

const MODE_TO_TEMA_LAYOUT: Record<ThemeMode, string> = {
  claro: "Claro",
  escuro: "Escuro",
  auto: "Automático",
};

export function modeToTemaLayout(m: ThemeMode): string {
  return MODE_TO_TEMA_LAYOUT[m];
}

export function temaLayoutToMode(v: string | null | undefined): ThemeMode | null {
  if (!v) return null;
  return TEMA_LAYOUT_TO_MODE[v] ?? null;
}

type Ctx = {
  mode: ThemeMode;
  resolved: Resolved;
  colors: ColorPalette;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<Ctx>({
  mode: "escuro",
  resolved: "escuro",
  colors: darkColors,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("escuro");
  const [system, setSystem] = useState<"claro" | "escuro">(
    Appearance.getColorScheme() === "light" ? "claro" : "escuro",
  );

  useEffect(() => {
    let mounted = true;
    getItem(THEME_KEY)
      .then((v) => {
        if (!mounted) return;
        if (v === "claro" || v === "escuro" || v === "auto") setModeState(v);
      })
      .catch(() => {});
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme === "light" ? "claro" : "escuro");
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setItem(THEME_KEY, m).catch(() => {});
  }, []);

  const resolved: Resolved = mode === "auto" ? system : mode;
  const colors = resolved === "claro" ? lightColors : darkColors;

  const value = useMemo<Ctx>(() => ({ mode, resolved, colors, setMode }), [mode, resolved, colors, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  return useContext(ThemeContext);
}

export function useColors(): ColorPalette {
  return useContext(ThemeContext).colors;
}

type ParamRow = { chave: string; valor: string };

export function useTemaLayoutSync(): {
  remoteMode: ThemeMode | null;
  saveMode: (m: ThemeMode) => Promise<void>;
  isSaving: boolean;
} {
  const { barbeariaId, isAuthenticated } = useAuth();
  const { setMode } = useTheme();
  const qc = useQueryClient();
  const appliedRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data } = useQuery<{ chave: string; valor: string } | null>({
    queryKey: ["parametros-tema-layout", barbeariaId],
    queryFn: async () => {
      if (!barbeariaId) return null;
      const raw = await fetchJson<unknown>(`/barbearias/${barbeariaId}/parametros/tema-layout`);
      return raw as { chave: string; valor: string } | null;
    },
    enabled: !!barbeariaId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const remoteValor = data?.valor || null;
  const remoteMode = temaLayoutToMode(remoteValor);

  useEffect(() => {
    if (!remoteMode) return;
    if (appliedRef.current === remoteMode) return;
    appliedRef.current = remoteMode;
    setMode(remoteMode);
  }, [remoteMode, setMode]);

  const saveMode = useCallback(
    async (m: ThemeMode) => {
      setMode(m);
      if (!barbeariaId) return;
      setIsSaving(true);
      try {
        await fetchJson(`/barbearias/${barbeariaId}/parametros/tema_layout`, {
          method: "PUT",
          body: { valor: modeToTemaLayout(m) },
        });
        appliedRef.current = m;
        qc.invalidateQueries({ queryKey: ["parametros-tema-layout", barbeariaId] });
      } catch (e) {
        throw new Error(getErrorMessage(e));
      } finally {
        setIsSaving(false);
      }
    },
    [barbeariaId, qc, setMode],
  );

  return { remoteMode, saveMode, isSaving };
}

export function ThemeSyncer() {
  useTemaLayoutSync();
  return null;
}
