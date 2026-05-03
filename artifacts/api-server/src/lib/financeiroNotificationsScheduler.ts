import { db } from "@workspace/db";
import { contasFinanceirasTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { sendPushToBarbearia } from "./pushNotifications.js";

const sentKeys = new Set<string>();

function fmtBRL(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "R$ 0,00";
  const v = typeof n === "string" ? parseFloat(n) : n;
  return `R$ ${(Number.isFinite(v) ? v : 0).toFixed(2).replace(".", ",")}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function checkContasAPagar(): Promise<void> {
  const hoje = todayISO();
  const d1 = addDays(hoje, 1);
  const d3 = addDays(hoje, 3);

  const contas = await db.select().from(contasFinanceirasTable).where(
    and(
      eq(contasFinanceirasTable.tipo, "pagar"),
      eq(contasFinanceirasTable.status, "pendente"),
      isNotNull(contasFinanceirasTable.dataVencimento),
    )
  );

  for (const c of contas) {
    const venc = c.dataVencimento as string;
    if (!venc) continue;
    let label: string | null = null;
    let suffix = "";
    if (venc < hoje) { label = "vencida"; suffix = "vencida"; }
    else if (venc === hoje) { label = "vence hoje"; suffix = "hoje"; }
    else if (venc === d1) { label = "vence amanhã"; suffix = "D-1"; }
    else if (venc === d3) { label = "vence em 3 dias"; suffix = "D-3"; }
    if (!label) continue;

    const key = `conta:${c.id}:${suffix}:${hoje}`;
    if (sentKeys.has(key)) continue;
    sentKeys.add(key);

    sendPushToBarbearia(c.barbeariaId, {
      title: `Conta a pagar ${label}`,
      body: `${c.descricao || c.categoria || "Conta"} — ${fmtBRL(c.valor)} (venc. ${venc})`,
      data: { type: "conta_a_pagar", contaId: c.id, vencimento: venc, status: suffix, url: "/financeiro/contas-pagar", route: "/financeiro/contas-pagar" },
      category: "financeiro",
    }).catch(err => console.error("[financeiro-scheduler] push error:", err));
  }
}

async function checkTrialExpiringSoon(): Promise<void> {
  const trials = await db.select({
    id: barbeariasTable.id,
    planoVencimento: barbeariasTable.planoVencimento,
  }).from(barbeariasTable).where(
    and(
      eq(barbeariasTable.subscriptionStatus, "trial"),
      eq(barbeariasTable.ativo, true),
      isNotNull(barbeariasTable.planoVencimento),
    )
  );

  const now = Date.now();
  const hoje = todayISO();
  for (const b of trials) {
    if (!b.planoVencimento) continue;
    const venc = new Date(b.planoVencimento as unknown as string | Date);
    const diffDays = Math.ceil((venc.getTime() - now) / (24 * 60 * 60 * 1000));
    let label: string | null = null;
    let suffix = "";
    if (diffDays === 3) { label = "em 3 dias"; suffix = "D-3"; }
    else if (diffDays === 1) { label = "amanhã"; suffix = "D-1"; }
    else if (diffDays === 0) { label = "hoje"; suffix = "hoje"; }
    if (!label) continue;

    const key = `trial:${b.id}:${suffix}:${hoje}`;
    if (sentKeys.has(key)) continue;
    sentKeys.add(key);

    sendPushToBarbearia(b.id, {
      title: `Seu período de teste termina ${label}`,
      body: "Escolha um plano para manter o acesso completo.",
      data: { type: "assinatura_status", status: "trial_expiring", suffix, url: "/configuracoes/assinatura", route: "/paywall" },
      category: "sistema",
    }).catch(err => console.error("[trial-warning] push error:", err));
  }
}

async function checkAssinaturas(): Promise<void> {
  const alvos = ["pendente", "inadimplente", "past_due", "unpaid", "incomplete", "incomplete_expired", "suspenso"];
  const rows = await db.select({
    id: barbeariasTable.id,
    nome: barbeariasTable.nome,
    subscriptionStatus: barbeariasTable.subscriptionStatus,
  }).from(barbeariasTable).where(inArray(barbeariasTable.subscriptionStatus, alvos));

  const hoje = todayISO();
  for (const b of rows) {
    const st = b.subscriptionStatus || "";
    const key = `assinatura:${b.id}:${st}:${hoje}`;
    if (sentKeys.has(key)) continue;
    sentKeys.add(key);

    let title = "Assinatura precisa de atenção";
    let body = `Status atual: ${st}. Atualize o pagamento para evitar interrupções.`;
    if (st === "past_due" || st === "inadimplente" || st === "unpaid") {
      title = "Cobrança recusada";
      body = "Não foi possível processar sua mensalidade. Atualize a forma de pagamento.";
    } else if (st === "suspenso") {
      title = "Assinatura suspensa";
      body = "Sua assinatura foi suspensa por inadimplência. Regularize para reativar.";
    } else if (st === "pendente") {
      title = "Assinatura pendente";
      body = "Seu período de teste terminou. Escolha um plano para continuar.";
    }

    sendPushToBarbearia(b.id, {
      title,
      body,
      data: { type: "assinatura_status", status: st, url: "/configuracoes/assinatura", route: "/paywall" },
      category: "sistema",
    }).catch(err => console.error("[assinatura-scheduler] push error:", err));
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startFinanceiroNotificationsScheduler(): void {
  if (interval) return;
  const TICK = 60 * 60 * 1000;
  console.log("[financeiro-scheduler] Starting (every 1h)");

  const run = () => {
    const hoje = todayISO();
    for (const k of Array.from(sentKeys)) {
      if (!k.endsWith(`:${hoje}`)) sentKeys.delete(k);
    }
    checkContasAPagar().catch(err => console.error("[financeiro-scheduler] contas error:", err));
    checkAssinaturas().catch(err => console.error("[financeiro-scheduler] assinaturas error:", err));
    checkTrialExpiringSoon().catch(err => console.error("[financeiro-scheduler] trial error:", err));
  };

  run();
  interval = setInterval(run, TICK);
}
