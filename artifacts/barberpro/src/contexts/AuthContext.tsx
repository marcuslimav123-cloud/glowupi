import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetCurrentUser, useLogoutUser, type UserWithBarbearia } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: UserWithBarbearia | null;
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  barbeariaId: number | null;
  role: string;
  isDono: boolean;
  isGerente: boolean;
  isColaborador: boolean;
  perfilPermissoes: string[] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  });

  const logoutMutation = useLogoutUser();

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = "/login";
    } catch (e) {
      console.error("Failed to logout", e);
    }
  };

  const userRole = user?.role || "dono";
  const perfilPermissoes = (user as any)?.perfilPermissoes ?? null;
  const value = {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !error,
    barbeariaId: user?.barbeariaId || null,
    role: userRole,
    isDono: userRole === "dono",
    isGerente: userRole === "gerente",
    isColaborador: userRole === "colaborador",
    perfilPermissoes,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
