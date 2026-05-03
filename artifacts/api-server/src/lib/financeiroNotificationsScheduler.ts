import { db } from "@workspace/db";
import { contasFinanceirasTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { sendPushToBarbearia } from "./pushNotifications.js";

const sentKeys = new Set<string>();

function fmtBRL(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;
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
      body: `${c.descricao || c.categoria || "Conta"} — ${fmtBRL(c.valor as any)} (venc. ${venc})`,
      data: { type: "conta_a_pagar", contaId: c.id, vencimento: venc, status: suffix, url: "/financeiro" },
    }).catch(err => console.error("[financeiro-scheduler] push error:", err));
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
      data: { type: "assinatura_status", status: st, url: "/configuracoes/assinatura" },
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
  };

  run();
  interval = setInterval(run, TICK);
}
