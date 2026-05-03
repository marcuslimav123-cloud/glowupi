import type { Href } from "expo-router";

export type NotifData = Record<string, unknown> | null | undefined;

const WEB_TO_MOBILE: Array<{ test: RegExp; route: Href }> = [
  { test: /^\/agenda\b|^\/agendamentos\b/, route: "/(tabs)/agenda" as Href },
  { test: /^\/comandas\b/, route: "/(tabs)/comandas" as Href },
  { test: /^\/clientes\b/, route: "/(tabs)/clientes" as Href },
  { test: /^\/financeiro\/comissoes\b/, route: "/financeiro/comissoes" as Href },
  { test: /^\/financeiro\/contas-pagar\b/, route: "/financeiro/contas-pagar" as Href },
  { test: /^\/financeiro\/contas-receber\b/, route: "/financeiro/contas-receber" as Href },
  { test: /^\/financeiro\/contas\b/, route: "/financeiro/contas-pagar" as Href },
  { test: /^\/financeiro\/fluxo\b/, route: "/financeiro/fluxo" as Href },
  { test: /^\/financeiro\b/, route: "/financeiro" as Href },
  { test: /^\/caixa\b/, route: "/caixa" as Href },
  { test: /^\/equipe\b/, route: "/equipe" as Href },
  { test: /^\/marketing\/avaliacoes\b/, route: "/marketing/avaliacoes" as Href },
  { test: /^\/marketing\b/, route: "/marketing" as Href },
  { test: /^\/relatorios\b/, route: "/relatorios" as Href },
  { test: /^\/configuracoes\/assinatura\b/, route: "/paywall" as Href },
  { test: /^\/configuracoes\b/, route: "/configuracoes" as Href },
];

const TYPE_TO_ROUTE: Record<string, Href> = {
  agendamento: "/(tabs)/agenda" as Href,
  agenda: "/(tabs)/agenda" as Href,
  reminder: "/(tabs)/agenda" as Href,
  new_appointment: "/(tabs)/agenda" as Href,
  pending_appointment: "/(tabs)/agenda" as Href,
  cancelled_appointment: "/(tabs)/agenda" as Href,
  pending_appointments_nudge: "/(tabs)/agenda" as Href,
  new_atendimento: "/(tabs)/agenda" as Href,
  comanda: "/(tabs)/comandas" as Href,
  comanda_fechada: "/(tabs)/comandas" as Href,
  comanda_paga: "/(tabs)/comandas" as Href,
  comissao_paga: "/financeiro/comissoes" as Href,
  conta_a_pagar: "/financeiro/contas-pagar" as Href,
  conta_a_receber: "/financeiro/contas-receber" as Href,
  caixa_sangria: "/caixa" as Href,
  caixa_vale: "/caixa" as Href,
  avaliacao_nova: "/relatorios" as Href,
  convite_aceito: "/equipe" as Href,
  assinatura_status: "/paywall" as Href,
  cliente: "/(tabs)/clientes" as Href,
};

export function deeplinkForPush(typeRaw: unknown, dados: NotifData): Href | null {
  const data = (dados ?? {}) as Record<string, unknown>;

  const explicitRoute = data.route ?? data.deeplink;
  if (typeof explicitRoute === "string" && explicitRoute.length > 0) {
    return explicitRoute as Href;
  }

  const url = data.url;
  if (typeof url === "string" && url.length > 0) {
    if (url.startsWith("/(") || url.startsWith("/(tabs)")) return url as Href;
    for (const { test, route } of WEB_TO_MOBILE) {
      if (test.test(url)) return route;
    }
  }

  const type = String(typeRaw ?? data.type ?? data.tipo ?? "").toLowerCase();
  if (TYPE_TO_ROUTE[type]) return TYPE_TO_ROUTE[type];
  if (type.startsWith("agend")) return "/(tabs)/agenda" as Href;
  if (type.startsWith("comanda")) return "/(tabs)/comandas" as Href;
  if (type.startsWith("comissao")) return "/financeiro/comissoes" as Href;
  if (type.startsWith("conta_a_receber")) return "/financeiro/contas-receber" as Href;
  if (type.startsWith("conta_") || type.startsWith("financeiro")) return "/financeiro/contas-pagar" as Href;
  if (type.startsWith("caixa")) return "/caixa" as Href;
  if (type.startsWith("avaliacao")) return "/relatorios" as Href;
  if (type.startsWith("convite") || type.startsWith("equipe")) return "/equipe" as Href;
  if (type.startsWith("assinatura")) return "/paywall" as Href;
  if (type.startsWith("cliente")) return "/(tabs)/clientes" as Href;
  return null;
}
