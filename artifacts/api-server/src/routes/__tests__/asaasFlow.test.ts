process.env.ASAAS_ENCRYPTION_KEY = process.env.ASAAS_ENCRYPTION_KEY
  || "test_asaas_encryption_key_for_e2e_tests_only_64chars_long_xxxxx";
process.env.PUBLIC_URL = process.env.PUBLIC_URL || "https://test.example.com";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test_session_secret";

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import http from "node:http";
import crypto from "node:crypto";
import { db, pool } from "@workspace/db";
import {
  usersTable, sessionsTable, barbeariasTable, profissionaisTable, servicosTable,
  agendamentosTable, comandasTable, asaasContasTable, pagamentosAsaasTable,
  asaasWebhookEventsTable, clienteUsersTable, clientSessionsTable,
  parametrosConfigTable, clientesTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import asaasContaRouter from "../asaasConta.js";
import asaasComandaRouter from "../asaasComanda.js";
import asaasSinalRouter from "../asaasSinal.js";
import asaasWebhookRouter from "../asaasWebhook.js";
import publicRouter from "../public.js";

type FetchHandler = (url: string, init: any) => any | Promise<any>;
const handlers: Array<{ match: RegExp | ((u: string, m: string) => boolean); fn: FetchHandler }> = [];
const realFetch = globalThis.fetch;

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchCalls: Array<{ method: string; url: string; body?: any }> = [];

globalThis.fetch = (async (input: any, init: any = {}) => {
  const url = typeof input === "string" ? input : input?.url;
  const method = (init?.method || "GET").toUpperCase();
  let parsedBody: any;
  if (init?.body) {
    try { parsedBody = JSON.parse(init.body); } catch { parsedBody = init.body; }
  }
  fetchCalls.push({ method, url, body: parsedBody });

  if (url.includes("api-sandbox.asaas.com") || url.includes("api.asaas.com")) {
    for (const h of handlers) {
      const ok = typeof h.match === "function" ? h.match(url, method) : h.match.test(`${method} ${url}`);
      if (ok) {
        return h.fn(url, init);
      }
    }
    throw new Error(`Asaas mock: no handler for ${method} ${url}`);
  }
  return realFetch(input as any, init as any);
}) as any;

const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

let server: http.Server;
let baseUrl: string;
let userId: number;
let token: string;
let barbeariaId: number;
let profissionalId: number;
let servicoId: number;
let agendamentoId: number;
let clienteUserId: number;
let clientToken: string;

const customers = new Map<string, any>();
const payments = new Map<string, any>();
let custCounter = 0;
let payCounter = 0;
let webhookCreated = false;

function setupAsaasMocks() {
  handlers.length = 0;

  handlers.push({
    match: (u, m) => m === "GET" && u.includes("/myAccount"),
    fn: () => jsonResponse({
      name: "Barbearia Teste E2E",
      email: "barb-e2e@test.local",
      cpfCnpj: "12345678000190",
      walletId: "wallet-fallback-id",
    }),
  });

  handlers.push({
    match: (u, m) => m === "GET" && u.includes("/wallets"),
    fn: () => jsonResponse({ data: [{ id: "wallet-main-id" }] }),
  });

  handlers.push({
    match: (u, m) => m === "POST" && u.endsWith("/webhooks"),
    fn: () => { webhookCreated = true; return jsonResponse({ id: `wh_${SUFFIX}`, enabled: true }); },
  });

  handlers.push({
    match: (u, m) => m === "GET" && /\/customers(\?|$)/.test(u),
    fn: (u) => {
      const ref = new URL(u).searchParams.get("externalReference");
      const found = ref ? Array.from(customers.values()).find(c => c.externalReference === ref) : null;
      return jsonResponse({ data: found ? [found] : [] });
    },
  });

  handlers.push({
    match: (u, m) => m === "POST" && u.endsWith("/customers"),
    fn: (_u, init) => {
      const body = JSON.parse(init.body || "{}");
      const id = `cus_${++custCounter}_${SUFFIX}`;
      const cust = { id, ...body };
      customers.set(id, cust);
      return jsonResponse(cust);
    },
  });

  handlers.push({
    match: (u, m) => m === "POST" && u.endsWith("/payments"),
    fn: (_u, init) => {
      const body = JSON.parse(init.body || "{}");
      const id = `pay_${++payCounter}_${SUFFIX}`;
      const payment = {
        id,
        customer: body.customer,
        billingType: body.billingType,
        value: body.value,
        netValue: body.value,
        status: "PENDING",
        dueDate: body.dueDate,
        description: body.description,
        externalReference: body.externalReference,
        invoiceUrl: `https://sandbox.asaas.com/i/${id}`,
        bankSlipUrl: body.billingType === "BOLETO" ? `https://sandbox.asaas.com/b/pdf/${id}` : null,
      };
      payments.set(id, payment);
      return jsonResponse(payment);
    },
  });

  handlers.push({
    match: (u, m) => m === "GET" && /\/payments\/[^/]+\/pixQrCode$/.test(u),
    fn: (u) => {
      const id = u.match(/\/payments\/([^/]+)\/pixQrCode$/)![1];
      return jsonResponse({
        encodedImage: "iVBORw0KGgoAAAA-fake-base64",
        payload: `00020126360014BR.GOV.BCB.PIX-${id}`,
        expirationDate: new Date(Date.now() + 86400000).toISOString(),
      });
    },
  });

  handlers.push({
    match: (u, m) => m === "GET" && /\/payments\/[^/]+$/.test(u),
    fn: (u) => {
      const id = u.match(/\/payments\/([^/]+)$/)![1];
      const p = payments.get(id);
      if (!p) return jsonResponse({ errors: [{ description: "not found" }] }, 404);
      return jsonResponse(p);
    },
  });

  handlers.push({
    match: (u, m) => m === "DELETE" && /\/payments\/[^/]+$/.test(u),
    fn: (u) => {
      const id = u.match(/\/payments\/([^/]+)$/)![1];
      const p = payments.get(id);
      if (p) p.status = "DELETED";
      return jsonResponse({ deleted: true, id });
    },
  });
}

function markPaymentPaid(id: string) {
  const p = payments.get(id);
  if (!p) throw new Error(`payment ${id} not found in mock`);
  p.status = "RECEIVED";
  p.paymentDate = new Date().toISOString().slice(0, 10);
  return p;
}

before(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  setupAsaasMocks();

  const [user] = await db.insert(usersTable).values({
    nome: "Asaas E2E Owner",
    email: `asaas_e2e_${SUFFIX}@test.local`,
    role: "dono",
  }).returning();
  userId = user.id;

  const [barb] = await db.insert(barbeariasTable).values({
    donoId: user.id,
    nome: `Asaas E2E Barb ${SUFFIX}`,
    slug: `asaas-e2e-${SUFFIX}`,
    prePagamentoAtivo: true,
    sinalModo: "percentual",
    sinalValor: "20",
  }).returning();
  barbeariaId = barb.id;

  token = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const [prof] = await db.insert(profissionaisTable).values({
    barbeariaId, nomeExibicao: "Prof Asaas", apelido: "ProfA",
    comissaoTipo: "percentual", comissaoValor: "40",
  }).returning();
  profissionalId = prof.id;

  const [serv] = await db.insert(servicosTable).values({
    barbeariaId, nome: "Corte Asaas", preco: "100.00", duracaoMinutos: 30,
  }).returning();
  servicoId = serv.id;

  const [ag] = await db.insert(agendamentosTable).values({
    barbeariaId,
    clienteNome: "Cliente Asaas",
    clienteTelefone: "11988887777",
    profissionalId, profissionalNome: "ProfA",
    servicoId, servicoNome: "Corte Asaas",
    data: new Date().toISOString().slice(0, 10),
    horaInicio: "10:00", horaFim: "10:30",
    status: "confirmado", valor: "100.00",
  }).returning();
  agendamentoId = ag.id;

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/barbearias/:barbeariaId/asaas", asaasContaRouter);
  app.use("/api/barbearias/:barbeariaId/asaas-comanda", asaasComandaRouter);
  app.use("/api/asaas-sinal", asaasSinalRouter);
  app.use("/api/webhooks", asaasWebhookRouter);
  app.use("/api/public", publicRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("server address unavailable");
  baseUrl = `http://127.0.0.1:${(addr as any).port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  try {
    await db.delete(asaasWebhookEventsTable).where(
      eq(asaasWebhookEventsTable.asaasContaId,
        (await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId)).limit(1))[0]?.id ?? -1)
    );
    await db.delete(pagamentosAsaasTable).where(eq(pagamentosAsaasTable.barbeariaId, barbeariaId));
    await db.delete(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
    await db.delete(comandasTable).where(eq(comandasTable.barbeariaId, barbeariaId));
    await db.delete(agendamentosTable).where(eq(agendamentosTable.barbeariaId, barbeariaId));
    await db.delete(parametrosConfigTable).where(eq(parametrosConfigTable.barbeariaId, barbeariaId));
    await db.delete(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));
    await db.delete(servicosTable).where(eq(servicosTable.barbeariaId, barbeariaId));
    await db.delete(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId));
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    if (clienteUserId) {
      await db.delete(clientSessionsTable).where(eq(clientSessionsTable.clienteUserId, clienteUserId));
      await db.delete(clienteUsersTable).where(eq(clienteUsersTable.id, clienteUserId));
    }
    await db.delete(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  } catch (err) {
    console.error("[asaas/cleanup] error:", err);
  }
  globalThis.fetch = realFetch;
  await pool.end();
});

async function api(path: string, init: { method?: string; body?: any; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  };
  const res = await fetch(`${baseUrl}${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const txt = await res.text();
  let json: any = null;
  if (txt) { try { json = JSON.parse(txt); } catch { json = { raw: txt }; } }
  return { status: res.status, body: json };
}

describe("Asaas E2E — conexão de conta", () => {
  it("POST /asaas/validar valida a chave e devolve dados da conta", async () => {
    const r = await api(`/api/barbearias/${barbeariaId}/asaas/validar`, {
      method: "POST",
      body: { apiKey: "$aas_sandbox_test_key_xxxxxxxxxxxx", ambiente: "sandbox" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
    assert.equal(r.body.account.email, "barb-e2e@test.local");
  });

  it("POST /asaas conecta a conta, criptografa a chave, registra webhook automaticamente", async () => {
    const r = await api(`/api/barbearias/${barbeariaId}/asaas`, {
      method: "POST",
      body: { apiKey: "$aas_sandbox_test_key_xxxxxxxxxxxx", ambiente: "sandbox" },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.conta.walletId, "wallet-main-id");
    assert.equal(r.body.webhook.ok, true);
    assert.match(r.body.webhook.url, /\/api\/webhooks\/asaas\//);
    assert.equal(webhookCreated, true);

    const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
    assert.ok(conta);
    assert.notEqual(conta.apiKeyEncrypted, "$aas_sandbox_test_key_xxxxxxxxxxxx");
    assert.equal(conta.webhookConfigured, true);
  });

  it("POST /asaas/webhook-auto reconfigura o webhook idempotentemente", async () => {
    webhookCreated = false;
    const r = await api(`/api/barbearias/${barbeariaId}/asaas/webhook-auto`, { method: "POST" });
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
    assert.equal(webhookCreated, true);
  });
});

describe("Asaas E2E — sinal de agendamento", () => {
  let sinalPaymentId: string;

  it("POST /asaas-sinal/agendamento/:id sem telefone correto retorna 401", async () => {
    const res = await fetch(`${baseUrl}/api/asaas-sinal/agendamento/${agendamentoId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billingType: "PIX", clienteTelefone: "0000000000" }),
    });
    assert.equal(res.status, 401);
  });

  it("POST /asaas-sinal/agendamento/:id gera Pix e marca sinal aguardando", async () => {
    const res = await fetch(`${baseUrl}/api/asaas-sinal/agendamento/${agendamentoId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billingType: "PIX", clienteTelefone: "11988887777" }),
    });
    assert.equal(res.status, 201, await res.clone().text());
    const body = await res.json() as any;
    assert.equal(body.billingType, "PIX");
    assert.equal(body.valor, 20);
    assert.ok(body.pixCopyPaste);
    assert.ok(body.pixQrCodeBase64);
    sinalPaymentId = body.asaasPaymentId;
    assert.ok(sinalPaymentId);

    const [ag] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendamentoId));
    assert.equal(ag.sinalStatus, "aguardando");
    assert.equal(ag.sinalAsaasPaymentId, sinalPaymentId);
  });

  it("GET /asaas-sinal/agendamento/:id/status — antes do pagamento retorna paid:false", async () => {
    const [agTok] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendamentoId));
    const res = await fetch(`${baseUrl}/api/asaas-sinal/agendamento/${agendamentoId}/status?token=${encodeURIComponent(agTok.sinalConsultaToken ?? "")}`);
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.paid, false);
  });

  it("Webhook PAYMENT_RECEIVED marca sinal como pago e o polling reflete isso", async () => {
    markPaymentPaid(sinalPaymentId);

    const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
    const wres = await fetch(`${baseUrl}/api/webhooks/asaas/${barbeariaId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "asaas-access-token": conta.webhookToken,
      },
      body: JSON.stringify({
        event: "PAYMENT_RECEIVED",
        payment: { id: sinalPaymentId, status: "RECEIVED", value: 20, netValue: 20, paymentDate: new Date().toISOString().slice(0, 10) },
      }),
    });
    assert.equal(wres.status, 200);

    const [ag] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendamentoId));
    assert.equal(ag.sinalStatus, "pago");
    assert.equal(parseFloat(ag.sinalValorPago as string), 20);

    const sres = await fetch(`${baseUrl}/api/asaas-sinal/agendamento/${agendamentoId}/status?token=${encodeURIComponent(ag.sinalConsultaToken ?? "")}`);
    const sbody = await sres.json() as any;
    assert.equal(sbody.paid, true);
    assert.equal(sbody.status, "pago");
  });

  it("Webhook duplicado é detectado (duplicate:true) e não reaplica side-effects", async () => {
    const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
    const payload = {
      event: "PAYMENT_RECEIVED",
      payment: { id: sinalPaymentId, status: "RECEIVED", value: 20, netValue: 20, paymentDate: new Date().toISOString().slice(0, 10) },
    };
    const wres = await fetch(`${baseUrl}/api/webhooks/asaas/${barbeariaId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "asaas-access-token": conta.webhookToken },
      body: JSON.stringify(payload),
    });
    assert.equal(wres.status, 200);
    const body = await wres.json() as any;
    assert.equal(body.duplicate, true);
  });

  it("Webhook com token inválido retorna 401", async () => {
    const wres = await fetch(`${baseUrl}/api/webhooks/asaas/${barbeariaId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "asaas-access-token": "token-errado" },
      body: JSON.stringify({ event: "PAYMENT_RECEIVED", payment: { id: sinalPaymentId, status: "RECEIVED" } }),
    });
    assert.equal(wres.status, 401);
  });
});

describe("Asaas E2E — cobrança de comanda", () => {
  let comandaId: number;
  let comandaPaymentId: string;

  before(async () => {
    const now = new Date();
    const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [agComanda] = await db.insert(agendamentosTable).values({
      barbeariaId,
      clienteNome: "Cliente Comanda",
      clienteTelefone: "11900001111",
      profissionalId, profissionalNome: "ProfA",
      servicoId, servicoNome: "Corte Asaas",
      data: new Date().toISOString().slice(0, 10),
      horaInicio: "11:00", horaFim: "11:30",
      status: "concluido", valor: "80.00",
    }).returning();
    const [c] = await db.insert(comandasTable).values({
      barbeariaId,
      agendamentoId: agComanda.id,
      clienteNome: "Cliente Comanda",
      profissionalId,
      profissionalNome: "ProfA",
      dataFechamento: now,
      mesAno,
      servicos: [{ servicoId, nome: "Corte Asaas", valor: 80 }],
      produtos: [],
      pagamentos: [],
      valorTotal: "80.00",
      comissaoTotal: "0",
      status: "aguardando_pagamento",
    }).returning();
    comandaId = c.id;
  });

  it("POST /asaas-comanda/comanda/:id/cobrar gera cobrança Pix", async () => {
    const r = await api(`/api/barbearias/${barbeariaId}/asaas-comanda/comanda/${comandaId}/cobrar`, {
      method: "POST", body: { billingType: "PIX" },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.billingType, "PIX");
    assert.equal(r.body.valor, 80);
    assert.ok(r.body.pixCopyPaste);
    comandaPaymentId = r.body.asaasPaymentId;

    const [c] = await db.select().from(comandasTable).where(eq(comandasTable.id, comandaId));
    assert.equal(c.status, "aguardando_pagamento");
    assert.equal(c.asaasPaymentId, comandaPaymentId);
  });

  it("GET status pré-pagamento retorna paid:false", async () => {
    const r = await api(`/api/barbearias/${barbeariaId}/asaas-comanda/comanda/${comandaId}/status`);
    assert.equal(r.status, 200);
    assert.equal(r.body.paid, false);
  });

  it("Webhook PAYMENT_RECEIVED marca comanda como paga", async () => {
    markPaymentPaid(comandaPaymentId);
    const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
    const wres = await fetch(`${baseUrl}/api/webhooks/asaas/${barbeariaId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "asaas-access-token": conta.webhookToken },
      body: JSON.stringify({
        event: "PAYMENT_RECEIVED",
        payment: { id: comandaPaymentId, status: "RECEIVED", value: 80, netValue: 80, paymentDate: new Date().toISOString().slice(0, 10) },
      }),
    });
    assert.equal(wres.status, 200);

    const [c] = await db.select().from(comandasTable).where(eq(comandasTable.id, comandaId));
    assert.equal(c.status, "paga");
    const pags = c.pagamentos as any[];
    assert.equal(pags.length, 1);
    assert.equal(pags[0].asaasPaymentId, comandaPaymentId);

    const r = await api(`/api/barbearias/${barbeariaId}/asaas-comanda/comanda/${comandaId}/status`);
    assert.equal(r.body.paid, true);
  });
});

describe("Asaas E2E — fluxo público /agendar e /agendar-simples", () => {
  const slug = `asaas-e2e-${SUFFIX}`;
  let agendarId: number;
  let agendarPaymentId: string;
  let agendarSimplesId: number;
  let agendarSimplesPaymentId: string;

  function futureDate(daysAhead = 7): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }

  before(async () => {
    const [cu] = await db.insert(clienteUsersTable).values({
      nome: "Cliente Público",
      email: `cliente_pub_${SUFFIX}@test.local`,
      telefone: "11955554444",
    }).returning();
    clienteUserId = cu.id;

    clientToken = crypto.randomBytes(32).toString("hex");
    await db.insert(clientSessionsTable).values({
      token: clientToken,
      clienteUserId: cu.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await db.insert(parametrosConfigTable).values({
      barbeariaId,
      chave: "agenda_tipo_link",
      valor: "Sem login (simples)",
    });
  });

  it("POST /:slug/agendar (cliente autenticado) cria agendamento com sinalPagamento Pix", async () => {
    const res = await fetch(`${baseUrl}/api/public/${slug}/agendar`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        profissionalId,
        servicoId,
        data: futureDate(7),
        horaInicio: "14:00",
        clienteWhatsapp: "11955554444",
        billingType: "PIX",
      }),
    });
    const body = await res.json() as any;
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.equal(body.status, "pendente_pagamento");
    assert.ok(body.sinalPagamento, "esperava sinalPagamento no payload");
    assert.equal(body.sinalPagamento.billingType, "PIX");
    assert.equal(body.sinalPagamento.valor, 20);
    assert.ok(body.sinalPagamento.pixCopyPaste);
    assert.ok(body.sinalPagamento.pixQrCodeBase64);

    agendarId = body.id;
    agendarPaymentId = body.sinalPagamento.asaasPaymentId;
    assert.ok(agendarPaymentId);

    const [ag] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendarId));
    assert.equal(ag.sinalStatus, "aguardando");
    assert.equal(ag.sinalAsaasPaymentId, agendarPaymentId);
    assert.equal(parseFloat(ag.sinalValorDevido as string), 20);
  });

  it("Webhook PAYMENT_RECEIVED marca o sinal de /agendar como pago", async () => {
    markPaymentPaid(agendarPaymentId);
    const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
    const wres = await fetch(`${baseUrl}/api/webhooks/asaas/${barbeariaId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "asaas-access-token": conta.webhookToken },
      body: JSON.stringify({
        event: "PAYMENT_RECEIVED",
        payment: { id: agendarPaymentId, status: "RECEIVED", value: 20, netValue: 20, paymentDate: new Date().toISOString().slice(0, 10) },
      }),
    });
    assert.equal(wres.status, 200);

    const [ag] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendarId));
    assert.equal(ag.sinalStatus, "pago");
    assert.equal(parseFloat(ag.sinalValorPago as string), 20);
  });

  it("POST /:slug/agendar-simples (sem login) cria agendamento com sinalPagamento Pix", async () => {
    const res = await fetch(`${baseUrl}/api/public/${slug}/agendar-simples`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profissionalId,
        servicoId,
        data: futureDate(8),
        horaInicio: "15:00",
        clienteNome: "Visitante Simples",
        clienteWhatsapp: "11933332222",
        billingType: "PIX",
      }),
    });
    const body = await res.json() as any;
    assert.equal(res.status, 201, JSON.stringify(body));
    assert.equal(body.status, "pendente_pagamento");
    assert.ok(body.sinalPagamento, "esperava sinalPagamento no payload");
    assert.equal(body.sinalPagamento.billingType, "PIX");
    assert.equal(body.sinalPagamento.valor, 20);
    assert.ok(body.sinalPagamento.pixCopyPaste);

    agendarSimplesId = body.id;
    agendarSimplesPaymentId = body.sinalPagamento.asaasPaymentId;
    assert.ok(agendarSimplesPaymentId);

    const [ag] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendarSimplesId));
    assert.equal(ag.sinalStatus, "aguardando");
    assert.equal(ag.sinalAsaasPaymentId, agendarSimplesPaymentId);
  });

  it("GET status do sinal de /agendar-simples reflete pagamento via webhook", async () => {
    const [agS] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendarSimplesId));
    const statusUrl = `${baseUrl}/api/asaas-sinal/agendamento/${agendarSimplesId}/status?token=${encodeURIComponent(agS.sinalConsultaToken ?? "")}`;
    const sresPre = await fetch(statusUrl);
    const preBody = await sresPre.json() as any;
    assert.equal(preBody.paid, false);

    markPaymentPaid(agendarSimplesPaymentId);
    const [conta] = await db.select().from(asaasContasTable).where(eq(asaasContasTable.barbeariaId, barbeariaId));
    const wres = await fetch(`${baseUrl}/api/webhooks/asaas/${barbeariaId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "asaas-access-token": conta.webhookToken },
      body: JSON.stringify({
        event: "PAYMENT_RECEIVED",
        payment: { id: agendarSimplesPaymentId, status: "RECEIVED", value: 20, netValue: 20, paymentDate: new Date().toISOString().slice(0, 10) },
      }),
    });
    assert.equal(wres.status, 200);

    const [ag] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendarSimplesId));
    assert.equal(ag.sinalStatus, "pago");

    const sresPos = await fetch(statusUrl);
    const posBody = await sresPos.json() as any;
    assert.equal(posBody.paid, true);
    assert.equal(posBody.status, "pago");
  });

  it("POST /:slug/agendar-simples retorna 403 quando agenda_tipo_link não é simples", async () => {
    await db.update(parametrosConfigTable)
      .set({ valor: "Com login" })
      .where(eq(parametrosConfigTable.barbeariaId, barbeariaId));

    const res = await fetch(`${baseUrl}/api/public/${slug}/agendar-simples`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profissionalId, servicoId,
        data: futureDate(9), horaInicio: "16:00",
        clienteNome: "Quem Quer Que Seja", clienteWhatsapp: "11922221111",
      }),
    });
    assert.equal(res.status, 403);

    await db.update(parametrosConfigTable)
      .set({ valor: "Sem login (simples)" })
      .where(eq(parametrosConfigTable.barbeariaId, barbeariaId));
  });

  it("POST /:slug/agendar sem sessão retorna 401", async () => {
    const res = await fetch(`${baseUrl}/api/public/${slug}/agendar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profissionalId, servicoId,
        data: futureDate(10), horaInicio: "17:00",
        clienteWhatsapp: "11955554444",
      }),
    });
    assert.equal(res.status, 401);
  });
});

describe("Asaas E2E — sinal abate valor da comanda", () => {
  it("Cobrança de comanda gerada via /agendamento/:id/cobrar desconta o sinal já pago", async () => {
    // Sinal de R$20 já foi pago acima para o agendamento principal.
    const r = await api(`/api/barbearias/${barbeariaId}/asaas-comanda/agendamento/${agendamentoId}/cobrar`, {
      method: "POST", body: { billingType: "PIX" },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    // valor agendamento = 100, sinal pago = 20 => cobra 80
    assert.equal(r.body.pagamento.valor, 80);
  });
});
