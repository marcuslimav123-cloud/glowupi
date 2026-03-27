import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface User {
  id: number;
  nome: string;
  email: string;
  role: string;
  telefone?: string;
  fotoUrl?: string;
  barbeariaId?: number;
  profissionalId?: number;
  tema?: string;
}

interface BarbeariaInfo {
  id: number;
  nome: string;
  slug: string;
  logoUrl?: string;
  subscriptionStatus?: string;
}

interface AuthState {
  user: User | null;
  barbearia: BarbeariaInfo | null;
  barbeariaId: number | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, senha: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "glow_upi_auth_token";
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    barbearia: null,
    barbeariaId: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  const fetchMe = useCallback(async (token: string) => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Sessão inválida");
    return res.json();
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setState({
        user: null,
        barbearia: null,
        barbeariaId: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }
    try {
      const data = await fetchMe(token);
      setState({
        user: data,
        barbearia: data.barbearia ?? null,
        barbeariaId: data.barbeariaId ?? null,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setState({
        user: null,
        barbearia: null,
        barbeariaId: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [getToken, fetchMe]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleAuthResponse = useCallback(async (data: { token: string }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    const meData = await fetchMe(data.token);
    setState({
      user: meData,
      barbearia: meData.barbearia ?? null,
      barbeariaId: meData.barbeariaId ?? null,
      token: data.token,
      isLoading: false,
      isAuthenticated: true,
    });
  }, [fetchMe]);

  const login = useCallback(async (email: string, senha: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao fazer login");
    await handleAuthResponse(data);
  }, [handleAuthResponse]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao fazer login com Google");
    await handleAuthResponse(data);
  }, [handleAuthResponse]);

  const logout = useCallback(async () => {
    const token = await getToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setState({
      user: null,
      barbearia: null,
      barbeariaId: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [getToken]);

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
