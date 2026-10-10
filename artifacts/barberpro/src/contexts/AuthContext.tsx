import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetCurrentUser, useLogoutUser, type UserWithBarbearia } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { defaultLogoUrl } from "@/lib/branding";

type UserWithPerfilPermissoes = UserWithBarbearia & {
  perfilPermissoes?: string[] | null;
  tema?: string;
  onboardingCompleto?: boolean;
  tutorialCompleto?: boolean;
  lgpdConsentido?: boolean;
};

interface AuthContextType {
  user: UserWithPerfilPermissoes | null;
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  barbeariaId: number | null;
  role: string;
  isDono: boolean;
  isGerente: boolean;
  isColaborador: boolean;
  perfilPermissoes: string[] | null;
  barbeariaNome: string | null;
  logoUrl: string | null;
  barbeariaSlug: string | null;
  tipoEstabelecimento: string | null;
  /** Logo padrão do sistema para este estabelecimento (quando não há logo própria). */
  logoPadrao: string;
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
  const typedUser = user as UserWithPerfilPermissoes | undefined;
  const perfilPermissoes = typedUser?.perfilPermissoes ?? null;
  const barbearia = user?.barbearia ?? null;
  const segmentacao = (barbearia as any)?.segmentacao ?? null;
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
    barbeariaNome: barbearia?.nome ?? null,
    logoUrl: barbearia?.logoUrl ?? null,
    barbeariaSlug: (barbearia as any)?.slug ?? null,
    tipoEstabelecimento: segmentacao?.tipoEstabelecimento ?? null,
    logoPadrao: defaultLogoUrl(segmentacao),
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
