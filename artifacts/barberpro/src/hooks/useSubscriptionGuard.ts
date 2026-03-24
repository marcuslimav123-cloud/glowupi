import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionStatus = "trial" | "ativo" | "inadimplente" | "cancelado" | "none";

export function useSubscriptionGuard() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return { canAccess: false, status: "none" as SubscriptionStatus, shouldShowUpgrade: false };
  }

  const barbearia = (user as any).barbearia;
  const status: SubscriptionStatus = barbearia?.subscriptionStatus || barbearia?.planoStatus || "trial";

  const canAccess = status === "trial" || status === "ativo";
  const shouldShowUpgrade = status === "trial";

  return { canAccess, status, shouldShowUpgrade };
}
