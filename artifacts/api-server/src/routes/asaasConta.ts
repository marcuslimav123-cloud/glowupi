import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { asaasContasTable, pagamentosAsaasTable, profissionaisTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { encryptApiKey, generateWebhookToken, maskApiKey, decryptApiKey } from "../lib/asaasCrypto.js";
import { createAsaasClient, type AsaasAmbiente } from "../lib/asaasClient.js";

const router: IRouter = Router({ mergeParams: true });

const WEBHOOK_EVENTS = [
  "PAYMENT_CREATED", "PAYMENT_AWAITING_RISK_ANALYSIS", "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS", "PAYMENT_AUTHORIZED", "PAYMENT_UPDATED",
  "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED",
  "PAYMENT_RESTORED", "PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_RECEIVED_IN_CASH_UNDONE", "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_DUNNING_RECEIVED", "PAYMENT_DUNNING_REQUESTED", "PAYMENT_BANK_SLIP_VIEWED",
  "PAYMENT_CHECKOUT_VIEWED",
];

function asAmbiente(v: string | null | undefined): AsaasAmbiente {
  return v === "producao" ? "producao" : "sandbox";
}

async function setupWebhookForConta(barbeariaId: number, conta: typeof asaasContasTable.$inferSelect): Promise<{ ok: boolean; url: string; error?: string }> {
  try {
    const apiKey = decryptApiKey(conta.apiKeyEncrypted);
    const client = createAsaasClient({ apiKey, ambiente: asAmbiente(conta.ambiente) });
    const baseUrl = process.env.PUBLIC_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || ""}`;
    const url = `${baseUrl}/api/webhooks/asaas/${barbeariaId}`;
    await client.createWebhook({
      url, enabled: true, interrupted: false, apiVersion: 3,
      authToken: conta.webhookToken, events: WEBHOOK_EVENTS,
      email: conta.accountEmail || undefined,
    });
    await db.update(asaasContasTable).set({ webhookConfigured: true, updatedAt: new Date() })
      .where(eq(asaasContasTable.id, conta.id));
    return { ok: true, url };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar webhook";
    console.error("[asaas/webhook-auto] erro:", msg);
    return { ok: false, url: "", error: msg };
  }
}

function publicConta(c: any, apiKeyPlain?: string) {
  if (!c) return null;
  return {
    id: c.id,
    barbeariaId: c.barbeariaId,
    ambiente: c.ambiente,
    walletId: c.walletId,
    accountName: c.accountName,
    accountEmail: c.accountEmail,
    accountCpfCnpj: c.accountCpfCnpj,
    apiKeyMasked: apiKeyPlain ? maskApiKey(apiKeyPlain) : "••••••",
    webhookToken: c.webhookToken,
    webhookConfigured: c.webhookConfigured,
    status: c.status,
    ultimaValidacao: c.ultimaValidacao?.toISOString?.() || c.ultimaValidacao,
    ultimoErro: c.ultimoErro,
    splitOptIn: c.splitOptIn,
    splitPercentualPlataforma: c.splitPercentualPlataforma ? parseFloat(c.splitPercentualPlataforma) : 0,
    createdAt: c.createdAt?.toISOString?.() || c.createdAt,
  };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1);
  if (!conta) return res.json({ conectado: false, conta: null });
  return res.json({ conectado: true, conta: publicConta(conta) });
});

router.post("/validar", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { apiKey, ambiente } = req.body || {};
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ error: "Informe a chave da API Asaas" });
  }
  const amb: AsaasAmbiente = ambiente === "producao" ? "producao" : "sandbox";
  try {
    const client = createAsaasClient({ apiKey, ambiente: amb });
    const me = await client.getMyAccount();
    return res.json({
      ok: true,
      ambiente: amb,
      account: { name: me?.name, email: me?.email, cpfCnpj: me?.cpfCnpj },
    });
  } catch (e: any) {
    console.error("[asaas/validar] erro:", e?.message);
    return res.status(400).json({ ok: false, error: e?.message || "Chave inválida" });
  }
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { apiKey, ambiente, splitOptIn, splitPercentualPlataforma } = req.body || {};
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ error: "Informe a chave da API Asaas" });
  }
  const amb: AsaasAmbiente = ambiente === "producao" ? "producao" : "sandbox";
  let me: any;
  let walletList: any;
  try {
    const client = createAsaasClient({ apiKey, ambiente: amb });
    me = await client.getMyAccount();
    try { walletList = await client.getWallet(); } catch {}
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || "Não foi possível validar a chave" });
  }
  const walletId = walletList?.data?.[0]?.id || me?.walletId || null;
  const apiKeyEncrypted = encryptApiKey(apiKey);
  const webhookToken = generateWebhookToken();
  const [existing] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1);

  let conta;
  if (existing) {
    [conta] = await db.update(asaasContasTable).set({
      apiKeyEncrypted, ambiente: amb, walletId,
      accountName: me?.name || existing.accountName,
      accountEmail: me?.email || existing.accountEmail,
      accountCpfCnpj: me?.cpfCnpj || existing.accountCpfCnpj,
      status: "ativo", ultimaValidacao: new Date(), ultimoErro: null,
      splitOptIn: typeof splitOptIn === "boolean" ? splitOptIn : existing.splitOptIn,
      splitPercentualPlataforma: splitPercentualPlataforma != null ? String(splitPercentualPlataforma) : existing.splitPercentualPlataforma,
      updatedAt: new Date(),
    }).where(eq(asaasContasTable.id, existing.id)).returning();
  } else {
    [conta] = await db.insert(asaasContasTable).values({
      barbeariaId, apiKeyEncrypted, ambiente: amb, walletId,
      accountName: me?.name, accountEmail: me?.email, accountCpfCnpj: me?.cpfCnpj,
      webhookToken, status: "ativo", ultimaValidacao: new Date(),
      splitOptIn: !!splitOptIn,
      splitPercentualPlataforma: splitPercentualPlataforma != null ? String(splitPercentualPlataforma) : "0",
    }).returning();
  }

  const webhookResult = await setupWebhookForConta(barbeariaId, conta);
  return res.status(201).json({
    conta: publicConta(conta, apiKey),
    webhook: webhookResult,
  });
});

router.put("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const [existing] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1);
  if (!existing) return res.status(404).json({ error: "Conta Asaas não conectada" });
  const { splitOptIn, splitPercentualPlataforma, status } = req.body || {};
  const updates: any = { updatedAt: new Date() };
  if (typeof splitOptIn === "boolean") updates.splitOptIn = splitOptIn;
  if (splitPercentualPlataforma != null) updates.splitPercentualPlataforma = String(splitPercentualPlataforma);
  if (status === "ativo" || status === "pausado") updates.status = status;
  const [conta] = await db.update(asaasContasTable).set(updates).where(eq(asaasContasTable.id, existing.id)).returning();
  return res.json({ conta: publicConta(conta) });
});

router.delete("/", requireAuth, requireRole("dono"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
  return res.json({ success: true });
});

router.get("/webhook-url", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1);
  if (!conta) return res.status(404).json({ error: "Conta Asaas não conectada" });
  const baseUrl = process.env.PUBLIC_URL || `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || ""}`;
  return res.json({
    url: `${baseUrl}/api/webhooks/asaas/${barbeariaId}`,
    authToken: conta.webhookToken,
  });
});

router.post("/webhook-auto", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1);
  if (!conta) return res.status(404).json({ error: "Conta Asaas não conectada" });
  const result = await setupWebhookForConta(barbeariaId, conta);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json({ ok: true, url: result.url });
});

router.get("/recebimentos", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { status, tipo, limit } = req.query;
  const conds = [eq(pagamentosAsaasTable.barbeariaId, barbeariaId)];
  if (status) conds.push(eq(pagamentosAsaasTable.status, String(status)));
  if (tipo) conds.push(eq(pagamentosAsaasTable.tipo, String(tipo)));
  const rows = await db.select().from(pagamentosAsaasTable)
    .where(and(...conds))
    .orderBy(desc(pagamentosAsaasTable.createdAt))
    .limit(Math.min(parseInt(String(limit || "100")), 500));
  return res.json(rows.map(r => ({
    ...r,
    valor: parseFloat(r.valor),
    valorLiquido: r.valorLiquido ? parseFloat(r.valorLiquido) : null,
    paidAt: r.paidAt?.toISOString?.() || r.paidAt,
    createdAt: r.createdAt?.toISOString?.() || r.createdAt,
    updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
  })));
});

router.put("/profissionais/:profId/wallet", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const profId = parseInt(req.params.profId);
  const { walletId, percentual } = req.body || {};
  const [updated] = await db.update(profissionaisTable).set({
    asaasWalletId: walletId || null,
    asaasSplitPercentual: percentual != null ? String(percentual) : null,
    updatedAt: new Date(),
  }).where(and(eq(profissionaisTable.id, profId), eq(profissionaisTable.barbeariaId, barbeariaId))).returning();
  if (!updated) return res.status(404).json({ error: "Profissional não encontrado" });
  return res.json({
    id: updated.id,
    asaasWalletId: updated.asaasWalletId,
    asaasSplitPercentual: updated.asaasSplitPercentual ? parseFloat(updated.asaasSplitPercentual) : null,
  });
});

export default router;
