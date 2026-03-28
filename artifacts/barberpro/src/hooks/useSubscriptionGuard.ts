import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionStatus = "trial" | "trial_expired" | "ativo" | "inadimplente" | "cancelado" | "pendente" | "none";

export function useSubscriptionGuard() {
  const { user, isAuthenticated, isDono } = useAuth();

  if (!isAuthenticated || !user) {
    return { canAccess: false, status: "none" as SubscriptionStatus, shouldShowUpgrade: false, trialDaysLeft: 0 };
  }

  if ((user as any).isSuperAdmin) {
    return { canAccess: true, status: "ativo" as SubscriptionStatus, shouldShowUpgrade: false, trialDaysLeft: 999 };
  }

  if (!isDono) {
    return { canAccess: true, status: "ativo" as SubscriptionStatus, shouldShowUpgrade: false, trialDaysLeft: 0 };
  }

  const barbearia = (user as any).barbearia;
  let status: SubscriptionStatus = barbearia?.subscriptionStatus || barbearia?.planoStatus || "trial";

  let trialDaysLeft = -1;

  if (status === "trial" && barbearia?.planoVencimento) {
    const vencimento = new Date(barbearia.planoVencimento);
    const now = new Date();
    const diffMs = vencimento.getTime() - now.getTime();
    trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    if (trialDaysLeft <= 0) {
      status = "trial_expired";
    }
  }

  const canAccess = status === "trial" || status === "ativo";
  const shouldShowUpgrade = status === "trial";

  return { canAccess, status, shouldShowUpgrade, trialDaysLeft };
}
