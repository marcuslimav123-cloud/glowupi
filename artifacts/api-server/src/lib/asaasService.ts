import { db } from "@workspace/db";
import {
  asaasContasTable, pagamentosAsaasTable, profissionaisTable, barbeariasTable,
  agendamentosTable, comandasTable,
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
}

export async function resolveSplit(opts: ResolveSplitOptions): Promise<AsaasSplit[] | undefined> {
  const splits: AsaasSplit[] = [];
  if (opts.profissionalId && opts.splitOptIn) {
    const [prof] = await db.select().from(profissionaisTable).where(
      and(eq(profissionaisTable.id, opts.profissionalId), eq(profissionaisTable.barbeariaId, opts.barbeariaId))
    ).limit(1);
    if (prof?.asaasWalletId && prof.asaasSplitPercentual) {
      const pct = parseFloat(prof.asaasSplitPercentual);
      if (pct > 0 && pct < 100) {
        splits.push({ walletId: prof.asaasWalletId, percentualValue: pct });
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

export function isPaidStatus(status: string | undefined | null): boolean {
  return status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH";
}

export async function processPagamentoPago(barbeariaId: number, pagamento: PagamentoAsaas): Promise<void> {
  const tipo = pagamento.tipo;

  if (tipo === "agendamento" && pagamento.refId) {
    const [ag] = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.id, pagamento.refId), eq(agendamentosTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!ag) return;
    if (ag.sinalStatus === "pago" && ag.pago) return;
    await db.update(agendamentosTable).set({
      sinalStatus: "pago",
      sinalValorPago: String(pagamento.valor),
      sinalConfirmadoEm: new Date(),
      pago: true,
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
    if (com.status === "paga") {
      const existingPags: any[] = Array.isArray(com.pagamentos) ? (com.pagamentos as any[]) : [];
      if (existingPags.some((p: any) => p.asaasPaymentId === pagamento.asaasPaymentId)) return;
    }
    const existingPags: any[] = Array.isArray(com.pagamentos) ? (com.pagamentos as any[]) : [];
    const novoPag = {
      metodo: `Asaas ${pagamento.billingType}`,
      valor: Number(pagamento.valor),
      dataPagamento: new Date().toISOString().slice(0, 10),
      registradoVia: "asaas",
      asaasPaymentId: pagamento.asaasPaymentId,
    };
    const filtered = existingPags.filter((p: any) => p.asaasPaymentId !== pagamento.asaasPaymentId);
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
  }
}

export async function nextDueDate(addDays = 1): Promise<string> {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0, 10);
}
