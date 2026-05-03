import { db } from "@workspace/db";
import {
  asaasContasTable, pagamentosAsaasTable, profissionaisTable, barbeariasTable,
  agendamentosTable, comandasTable, pacotesClienteTable, pacotesTable,
  assinaturasAsaasTable,
  type AsaasConta, type PagamentoAsaas,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { createAsaasClient, type AsaasClient, type AsaasSplit, type AsaasBillingType } from "./asaasClient.js";
import { decryptApiKey } from "./asaasCrypto.js";
import { sendPushToBarbearia } from "./pushNotifications.js";

export type SinalRefType = "agendamento" | "comanda" | "pacote_cliente" | "saas" | "avulso";

export async function getContaByBarbearia(barbeariaId: number): Promise<AsaasConta | null> {
  const [c] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1);
  return c || null;
}

export async function getClientForBarbearia(barbeariaId: number): Promise<{ client: AsaasClient; conta: AsaasConta } | null> {
  const conta = await getContaByBarbearia(barbeariaId);
  if (!conta || conta.status !== "ativo") return null;
  const apiKey = decryptApiKey(conta.apiKeyEncrypted);
  const ambiente = conta.ambiente === "producao" ? "producao" : "sandbox";
  const client = createAsaasClient({ apiKey, ambiente });
  return { client, conta };
}

export interface ResolveSplitOptions {
  barbeariaId: number;
  profissionalId?: number | null;
  splitOptIn: boolean;
  splitPercentualPlataforma?: number;
  paymentValue?: number;
}

export async function resolveSplit(opts: ResolveSplitOptions): Promise<AsaasSplit[] | undefined> {
  const splits: AsaasSplit[] = [];
  if (opts.profissionalId && opts.splitOptIn) {
    const [prof] = await db.select().from(profissionaisTable).where(
      and(eq(profissionaisTable.id, opts.profissionalId), eq(profissionaisTable.barbeariaId, opts.barbeariaId))
    ).limit(1);
    if (prof?.asaasWalletId) {
      let pct: number | null = null;
      let fixedValue: number | null = null;

      // 1) Override explícito por asaasSplitPercentual (config Asaas)
      if (prof.asaasSplitPercentual) {
        const v = parseFloat(prof.asaasSplitPercentual);
        if (v > 0 && v < 100) pct = v;
      }

      // 2) Calcular a partir de comissaoTipo/comissaoValor
      if (pct == null && fixedValue == null) {
        const cv = parseFloat(prof.comissaoValor || "0");
        if (prof.comissaoTipo === "percentual") {
          if (cv > 0 && cv < 100) pct = cv;
        } else if (prof.comissaoTipo === "valor_fixo") {
          if (cv > 0 && opts.paymentValue && opts.paymentValue > 0) {
            // Cap fixedValue em 80% do paymentValue para garantir margem da plataforma
            fixedValue = Math.min(cv, opts.paymentValue * 0.8);
            if (fixedValue <= 0.01) fixedValue = null;
          }
        }
      }

      if (pct != null) {
        splits.push({ walletId: prof.asaasWalletId, percentualValue: pct });
      } else if (fixedValue != null) {
        splits.push({ walletId: prof.asaasWalletId, fixedValue: Number(fixedValue.toFixed(2)) });
      }
    }
  }
  return splits.length > 0 ? splits : undefined;
}

export interface CreatePaymentForBarbeariaInput {
  barbeariaId: number;
  tipo: SinalRefType;
  refType?: string;
  refId?: number;
  profissionalId?: number | null;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  payer: { nome: string; telefone?: string; email?: string; cpfCnpj?: string };
  splitOptIn?: boolean;
  externalReference?: string;
}

export interface CreatePaymentResult {
  pagamento: PagamentoAsaas;
  asaasPayment: any;
  pixData?: { encodedImage: string; payload: string; expirationDate?: string };
}

export async function createPaymentForBarbearia(input: CreatePaymentForBarbeariaInput): Promise<CreatePaymentResult> {
  const ctx = await getClientForBarbearia(input.barbeariaId);
  if (!ctx) {
    throw new Error("Conta Asaas não conectada para esta barbearia");
  }
  const { client, conta } = ctx;

  const customer = await client.upsertCustomer({
    name: input.payer.nome,
    email: input.payer.email,
    mobilePhone: input.payer.telefone,
    cpfCnpj: input.payer.cpfCnpj,
    externalReference: input.externalReference || `barb-${input.barbeariaId}-${input.payer.telefone || input.payer.nome}`,
  });

  const split = await resolveSplit({
    barbeariaId: input.barbeariaId,
    profissionalId: input.profissionalId ?? undefined,
    splitOptIn: input.splitOptIn ?? conta.splitOptIn,
    paymentValue: input.value,
  });

  const payment = await client.createPayment({
    customer: customer.id,
    billingType: input.billingType,
    value: Number(input.value.toFixed(2)),
    dueDate: input.dueDate,
    description: input.description,
    externalReference: `${input.tipo}:${input.refType || ""}:${input.refId || ""}`,
    split,
  });

  let pixData: any = undefined;
  if (input.billingType === "PIX") {
    try {
      pixData = await client.getPixQrCode(payment.id);
    } catch (e) {
      console.error("[asaas] Erro ao buscar QR Code PIX:", e);
    }
  }

  const [pagamento] = await db.insert(pagamentosAsaasTable).values({
    barbeariaId: input.barbeariaId,
    tipo: input.tipo,
    refType: input.refType || null,
    refId: input.refId || null,
    asaasPaymentId: payment.id,
    asaasCustomerId: customer.id,
    billingType: input.billingType,
    valor: String(input.value),
    status: payment.status || "PENDING",
    description: input.description || null,
    pixQrCodeBase64: pixData?.encodedImage || null,
    pixCopyPaste: pixData?.payload || null,
    pixExpiraEm: pixData?.expirationDate ? new Date(pixData.expirationDate) : null,
    bankSlipUrl: payment.bankSlipUrl || null,
    invoiceUrl: payment.invoiceUrl || null,
    dueDate: payment.dueDate || input.dueDate,
    payerNome: input.payer.nome,
    payerEmail: input.payer.email || null,
    payerTelefone: input.payer.telefone || null,
    payerCpfCnpj: input.payer.cpfCnpj || null,
    splitJson: split ? split : null,
    metadata: { customerId: customer.id },
  }).returning();

  return { pagamento, asaasPayment: payment, pixData };
}

export async function getPagamentoByAsaasId(asaasPaymentId: string): Promise<PagamentoAsaas | null> {
  const [p] = await db.select().from(pagamentosAsaasTable).where(eq(pagamentosAsaasTable.asaasPaymentId, asaasPaymentId)).limit(1);
  return p || null;
}

export async function refreshPagamentoStatus(asaasPaymentId: string): Promise<PagamentoAsaas | null> {
  const pagamento = await getPagamentoByAsaasId(asaasPaymentId);
  if (!pagamento || !pagamento.barbeariaId) return pagamento;
  const ctx = await getClientForBarbearia(pagamento.barbeariaId);
  if (!ctx) return pagamento;
  try {
    const remote = await ctx.client.getPayment(asaasPaymentId);
    return await updatePagamentoFromAsaas(asaasPaymentId, remote);
  } catch (e) {
    console.error("[asaas] refreshPagamentoStatus error:", e);
    return pagamento;
  }
}

export async function updatePagamentoFromAsaas(asaasPaymentId: string, payment: any): Promise<PagamentoAsaas | null> {
  const updates: any = {
    status: payment.status,
    valorLiquido: payment.netValue ? String(payment.netValue) : undefined,
    updatedAt: new Date(),
  };
  if (payment.status === "RECEIVED" || payment.status === "CONFIRMED" || payment.status === "RECEIVED_IN_CASH") {
    updates.paidAt = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
  }
  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
  const [updated] = await db.update(pagamentosAsaasTable).set(updates)
    .where(eq(pagamentosAsaasTable.asaasPaymentId, asaasPaymentId))
    .returning();
  return updated || null;
}

export async function cancelPagamento(barbeariaId: number, asaasPaymentId: string): Promise<{ ok: true; status: string }> {
  const ctx = await getClientForBarbearia(barbeariaId);
  if (!ctx) throw new Error("Conta Asaas não conectada");
  const pagamento = await getPagamentoByAsaasId(asaasPaymentId);
  if (!pagamento || pagamento.barbeariaId !== barbeariaId) throw new Error("Pagamento não encontrado");
  if (isPaidStatus(pagamento.status)) throw new Error("Pagamento já recebido — não pode ser cancelado");
  await ctx.client.deletePayment(asaasPaymentId);
  await db.update(pagamentosAsaasTable).set({
    status: "DELETED",
    updatedAt: new Date(),
  }).where(eq(pagamentosAsaasTable.asaasPaymentId, asaasPaymentId));
  return { ok: true, status: "DELETED" };
}

export async function reemitirPagamento(
  barbeariaId: number,
  asaasPaymentId: string,
  opts: { billingType?: "PIX" | "BOLETO" | "CREDIT_CARD"; dueDate?: string } = {}
): Promise<{ ok: true; novo: PagamentoAsaas }> {
  const ctx = await getClientForBarbearia(barbeariaId);
  if (!ctx) throw new Error("Conta Asaas não conectada");
  const pagamento = await getPagamentoByAsaasId(asaasPaymentId);
  if (!pagamento || pagamento.barbeariaId !== barbeariaId) throw new Error("Pagamento não encontrado");
  if (isPaidStatus(pagamento.status)) throw new Error("Pagamento já recebido — não pode ser reemitido");

  // Cancela o anterior se ainda existir
  if (pagamento.status !== "DELETED") {
    try { await ctx.client.deletePayment(asaasPaymentId); } catch {}
    await db.update(pagamentosAsaasTable).set({ status: "DELETED", updatedAt: new Date() })
      .where(eq(pagamentosAsaasTable.asaasPaymentId, asaasPaymentId));
  }

  const novoBilling = (opts.billingType || pagamento.billingType || "PIX") as any;
  const dueDate = opts.dueDate || (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

  const result = await createPaymentForBarbearia({
    barbeariaId,
    tipo: pagamento.tipo,
    refType: (pagamento.refType || "avulso") as any,
    refId: pagamento.refId || undefined,
    profissionalId: pagamento.profissionalId,
    billingType: novoBilling,
    value: parseFloat(String(pagamento.valor)),
    dueDate,
    description: pagamento.description || "Reemissão",
    payer: {
      nome: pagamento.payerNome || "Cliente",
      telefone: pagamento.payerTelefone || undefined,
      email: pagamento.payerEmail || undefined,
      cpfCnpj: pagamento.payerCpfCnpj || undefined,
    },
    externalReference: pagamento.externalReference || undefined,
  });

  if (pagamento.metadata) {
    await db.update(pagamentosAsaasTable).set({ metadata: pagamento.metadata })
      .where(eq(pagamentosAsaasTable.id, result.pagamento.id));
  }

  return { ok: true, novo: result.pagamento };
}

export function isPaidStatus(status: string | undefined | null): boolean {
  return status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH";
}

const REFUNDED_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_RECEIVED_IN_CASH_UNDONE", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"]);
const OVERDUE_EVENTS = new Set(["PAYMENT_OVERDUE", "PAYMENT_DUNNING_RECEIVED", "PAYMENT_DUNNING_REQUESTED"]);
const DELETED_EVENTS = new Set(["PAYMENT_DELETED"]);

export async function processPagamentoEventoNaoPago(
  barbeariaId: number,
  evento: string,
  pagamento: PagamentoAsaas,
): Promise<void> {
  const isRefund = REFUNDED_EVENTS.has(evento);
  const isOverdue = OVERDUE_EVENTS.has(evento);
  const isDeleted = DELETED_EVENTS.has(evento);
  if (!isRefund && !isOverdue && !isDeleted) return;

  if (pagamento.tipo === "agendamento" && pagamento.refId) {
    const [ag] = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.id, pagamento.refId), eq(agendamentosTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!ag) return;
    if (isRefund || isDeleted) {
      await db.update(agendamentosTable).set({
        sinalStatus: isRefund ? "estornado" : "cancelado",
        updatedAt: new Date(),
      }).where(eq(agendamentosTable.id, ag.id));
      sendPushToBarbearia(barbeariaId, {
        title: isRefund ? "Sinal estornado" : "Cobrança de sinal cancelada",
        body: `${ag.clienteNome || "Cliente"} — R$ ${Number(pagamento.valor).toFixed(2).replace(".", ",")}`,
        data: { type: "comanda_paga", agendamentoId: ag.id, url: "/agenda" },
        category: "financeiro",
      }).catch(err => console.error("[Push] sinal estorno:", err));
    } else if (isOverdue) {
      await db.update(agendamentosTable).set({
        sinalStatus: "vencido",
        updatedAt: new Date(),
      }).where(eq(agendamentosTable.id, ag.id));
      sendPushToBarbearia(barbeariaId, {
        title: "Sinal vencido",
        body: `${ag.clienteNome || "Cliente"} não pagou o sinal a tempo`,
        data: { type: "comanda_paga", agendamentoId: ag.id, url: "/agenda" },
        category: "financeiro",
      }).catch(err => console.error("[Push] sinal vencido:", err));
    }
    return;
  }

  if (pagamento.tipo === "comanda" && pagamento.refId) {
    const [com] = await db.select().from(comandasTable).where(
      and(eq(comandasTable.id, pagamento.refId), eq(comandasTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!com) return;
    if (isRefund || isDeleted) {
      await db.update(comandasTable).set({
        status: "aguardando_pagamento",
        asaasPaymentId: isDeleted ? null : com.asaasPaymentId,
      }).where(eq(comandasTable.id, com.id));
      sendPushToBarbearia(barbeariaId, {
        title: isRefund ? "Comanda estornada" : "Cobrança cancelada",
        body: `${com.clienteNome || "Cliente"} — R$ ${Number(pagamento.valor).toFixed(2).replace(".", ",")}`,
        data: { type: "comanda_paga", comandaId: com.id, url: "/comandas" },
        category: "financeiro",
      }).catch(err => console.error("[Push] comanda estorno:", err));
    } else if (isOverdue) {
      sendPushToBarbearia(barbeariaId, {
        title: "Cobrança vencida",
        body: `${com.clienteNome || "Cliente"} — R$ ${Number(pagamento.valor).toFixed(2).replace(".", ",")}`,
        data: { type: "comanda_paga", comandaId: com.id, url: "/comandas" },
        category: "financeiro",
      }).catch(err => console.error("[Push] comanda vencida:", err));
    }
  }
}

export async function processPagamentoPago(barbeariaId: number, pagamento: PagamentoAsaas): Promise<void> {
  const tipo = pagamento.tipo;

  if (tipo === "agendamento" && pagamento.refId) {
    const [ag] = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.id, pagamento.refId), eq(agendamentosTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!ag) return;
    if (ag.sinalStatus === "pago") return;
    await db.update(agendamentosTable).set({
      sinalStatus: "pago",
      sinalValorPago: String(pagamento.valor),
      sinalConfirmadoEm: new Date(),
      status: ag.status === "cancelado" ? ag.status : (ag.status === "pendente_pagamento" ? "confirmado" : ag.status),
      updatedAt: new Date(),
    }).where(eq(agendamentosTable.id, pagamento.refId));

    sendPushToBarbearia(barbeariaId, {
      title: "Sinal recebido",
      body: `${pagamento.payerNome || "Cliente"} confirmou o sinal de R$ ${Number(pagamento.valor).toFixed(2).replace(".", ",")}`,
      data: { type: "comanda_paga", agendamentoId: pagamento.refId, url: "/agenda" },
      category: "financeiro",
    }).catch(err => console.error("[Push] sinal pago:", err));
    return;
  }

  if (tipo === "comanda" && pagamento.refId) {
    const [com] = await db.select().from(comandasTable).where(
      and(eq(comandasTable.id, pagamento.refId), eq(comandasTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!com) return;
    type ComandaPagamento = {
      metodo: string;
      valor: number;
      dataPagamento: string;
      registradoVia?: string;
      asaasPaymentId?: string | null;
    };
    const existingPags: ComandaPagamento[] = Array.isArray(com.pagamentos) ? (com.pagamentos as ComandaPagamento[]) : [];
    if (com.status === "paga") {
      if (existingPags.some(p => p.asaasPaymentId === pagamento.asaasPaymentId)) return;
    }
    const novoPag: ComandaPagamento = {
      metodo: `Asaas ${pagamento.billingType}`,
      valor: Number(pagamento.valor),
      dataPagamento: new Date().toISOString().slice(0, 10),
      registradoVia: "asaas",
      asaasPaymentId: pagamento.asaasPaymentId,
    };
    const filtered = existingPags.filter(p => p.asaasPaymentId !== pagamento.asaasPaymentId);
    await db.update(comandasTable).set({
      status: "paga",
      pagamentos: [...filtered, novoPag],
    }).where(eq(comandasTable.id, com.id));

    if (com.agendamentoId) {
      await db.update(agendamentosTable).set({
        pago: true,
        status: "concluido",
        updatedAt: new Date(),
      }).where(and(eq(agendamentosTable.id, com.agendamentoId), eq(agendamentosTable.barbeariaId, barbeariaId)));
    }

    sendPushToBarbearia(barbeariaId, {
      title: "Comanda paga",
      body: `${com.clienteNome || "Cliente"} — R$ ${Number(pagamento.valor).toFixed(2).replace(".", ",")} via Asaas`,
      data: { type: "comanda_paga", comandaId: com.id, url: "/comandas" },
      category: "financeiro",
    }).catch(err => console.error("[Push] comanda paga:", err));
    return;
  }

  if (tipo === "pacote_cliente") {
    // Metadata contém os dados para criar/ativar o pacote do cliente
    const meta = (pagamento.metadata || {}) as any;
    const pacoteId = Number(meta.pacoteId || 0);
    if (!pacoteId) return;
    const [pacote] = await db.select().from(pacotesTable).where(
      and(eq(pacotesTable.id, pacoteId), eq(pacotesTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!pacote) return;

    // Se refId já existe (pacotesCliente já criado), apenas ativa
    if (pagamento.refId) {
      const [existente] = await db.select().from(pacotesClienteTable).where(
        and(eq(pacotesClienteTable.id, pagamento.refId), eq(pacotesClienteTable.barbeariaId, barbeariaId))
      ).limit(1);
      if (existente && existente.status !== "ativo") {
        await db.update(pacotesClienteTable).set({ status: "ativo" }).where(eq(pacotesClienteTable.id, existente.id));
      }
    } else {
      const dataValidade = pacote.validade ? new Date(Date.now() + pacote.validade * 86400000) : null;
      const [pc] = await db.insert(pacotesClienteTable).values({
        barbeariaId,
        pacoteId,
        clienteId: meta.clienteId ?? null,
        clienteNome: meta.clienteNome || pagamento.payerNome || "Cliente",
        sessoesTotal: pacote.sessoesTotal,
        dataValidade,
      }).returning();
      await db.update(pagamentosAsaasTable).set({ refId: pc.id, refType: "pacote_cliente" })
        .where(eq(pagamentosAsaasTable.id, pagamento.id));
    }

    sendPushToBarbearia(barbeariaId, {
      title: "Pacote pago",
      body: `${pagamento.payerNome || "Cliente"} — ${pacote.nome} R$ ${Number(pagamento.valor).toFixed(2).replace(".", ",")}`,
      data: { type: "comanda_paga", url: "/pacotes/clientes" },
      category: "financeiro",
    }).catch(err => console.error("[Push] pacote pago:", err));
    return;
  }

  if (tipo === "saas") {
    if (!pagamento.asaasSubscriptionId) return;
    await db.update(assinaturasAsaasTable).set({
      status: "ACTIVE",
      updatedAt: new Date(),
    }).where(eq(assinaturasAsaasTable.asaasSubscriptionId, pagamento.asaasSubscriptionId));
    return;
  }
}

export async function nextDueDate(addDays = 1): Promise<string> {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0, 10);
}
