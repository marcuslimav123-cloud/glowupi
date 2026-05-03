import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { comandasTable, barbeariasTable, pagamentosAsaasTable, agendamentosTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import { createPaymentForBarbearia, refreshPagamentoStatus, getContaByBarbearia, isPaidStatus } from "../lib/asaasService.js";

const router: IRouter = Router({ mergeParams: true });

router.post("/comanda/:comandaId/cobrar", requireAuth, async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const comandaId = parseInt(req.params.comandaId);
    const { billingType, dueDate, payerCpfCnpj } = req.body || {};
    const tipo = (billingType === "BOLETO" || billingType === "CREDIT_CARD") ? billingType : "PIX";

    const [comanda] = await db.select().from(comandasTable).where(
      and(eq(comandasTable.id, comandaId), eq(comandasTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!comanda) return res.status(404).json({ error: "Comanda não encontrada" });

    const conta = await getContaByBarbearia(barbeariaId);
    if (!conta) return res.status(503).json({ error: "Conta de pagamento não conectada" });

    if (comanda.asaasPaymentId) {
      const refreshed = await refreshPagamentoStatus(comanda.asaasPaymentId);
      if (refreshed) return res.json(formatPagamento(refreshed));
    }

    const valor = parseFloat(String(comanda.valorTotal || "0"));
    if (valor <= 0) return res.status(400).json({ error: "Valor inválido" });

    const due = dueDate || (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

    const result = await createPaymentForBarbearia({
      barbeariaId,
      tipo: "comanda",
      refType: "comanda",
      refId: comanda.id,
      billingType: tipo,
      value: valor,
      dueDate: due,
      description: `Comanda #${comanda.id} — ${comanda.clienteNome}`,
      payer: {
        nome: comanda.clienteNome,
        cpfCnpj: payerCpfCnpj,
      },
      externalReference: `comanda-${comanda.id}`,
    });

    await db.update(comandasTable).set({
      asaasPaymentId: result.pagamento.asaasPaymentId,
      status: "aguardando_pagamento",
    }).where(eq(comandasTable.id, comandaId));

    return res.status(201).json(formatPagamento(result.pagamento));
  } catch (e: any) {
    console.error("[asaas/comanda] cobrar erro:", e);
    return res.status(500).json({ error: e?.message || "Erro ao gerar cobrança" });
  }
});

router.get("/comanda/:comandaId/status", requireAuth, async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const comandaId = parseInt(req.params.comandaId);
    const [comanda] = await db.select().from(comandasTable).where(
      and(eq(comandasTable.id, comandaId), eq(comandasTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!comanda) return res.status(404).json({ error: "Comanda não encontrada" });
    if (!comanda.asaasPaymentId) return res.json({ paid: false, pagamento: null });
    const refreshed = await refreshPagamentoStatus(comanda.asaasPaymentId);
    if (!refreshed) return res.json({ paid: false, pagamento: null });
    return res.json({ paid: isPaidStatus(refreshed.status), pagamento: formatPagamento(refreshed) });
  } catch (e: any) {
    console.error("[asaas/comanda] status erro:", e);
    return res.status(500).json({ error: "Erro ao consultar status" });
  }
});

router.post("/agendamento/:agendamentoId/cobrar", requireAuth, async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const agendamentoId = parseInt(req.params.agendamentoId);
    const { billingType, valor: valorBody, payerCpfCnpj } = req.body || {};
    const tipo = (billingType === "BOLETO" || billingType === "CREDIT_CARD") ? billingType : "PIX";

    const [ag] = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.id, agendamentoId), eq(agendamentosTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!ag) return res.status(404).json({ error: "Agendamento não encontrado" });

    const conta = await getContaByBarbearia(barbeariaId);
    if (!conta) return res.status(503).json({ error: "Conta de pagamento não conectada" });

    const valor = Number(valorBody) > 0 ? Number(valorBody) : Number(ag.valor || 0);
    if (valor <= 0) return res.status(400).json({ error: "Valor inválido" });

    let comandaId: number;
    const [existing] = await db.select().from(comandasTable).where(
      and(eq(comandasTable.agendamentoId, agendamentoId), eq(comandasTable.barbeariaId, barbeariaId))
    ).limit(1);

    if (existing) {
      comandaId = existing.id;
      if (existing.asaasPaymentId) {
        const refreshed = await refreshPagamentoStatus(existing.asaasPaymentId);
        if (refreshed) return res.json({ comandaId, pagamento: formatPagamento(refreshed) });
      }
    } else {
      const now = new Date();
      const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [novaComanda] = await db.insert(comandasTable).values({
        barbeariaId,
        agendamentoId,
        clienteId: ag.clienteId,
        clienteNome: ag.clienteNome,
        profissionalId: ag.profissionalId,
        profissionalNome: ag.profissionalNome,
        dataFechamento: now,
        mesAno,
        servicos: [{ servicoId: ag.servicoId, nome: ag.servicoNome, valor }],
        produtos: [],
        pagamentos: [],
        valorTotal: String(valor),
        comissaoTotal: "0",
        status: "aguardando_pagamento",
      }).returning();
      comandaId = novaComanda.id;
    }

    const due = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

    const result = await createPaymentForBarbearia({
      barbeariaId,
      tipo: "comanda",
      refType: "comanda",
      refId: comandaId,
      billingType: tipo,
      value: valor,
      dueDate: due,
      description: `Comanda #${comandaId} — ${ag.clienteNome}`,
      payer: { nome: ag.clienteNome, cpfCnpj: payerCpfCnpj },
      externalReference: `comanda-${comandaId}`,
    });

    await db.update(comandasTable).set({
      asaasPaymentId: result.pagamento.asaasPaymentId,
      status: "aguardando_pagamento",
    }).where(eq(comandasTable.id, comandaId));

    return res.status(201).json({ comandaId, pagamento: formatPagamento(result.pagamento) });
  } catch (e: any) {
    console.error("[asaas/comanda] cobrar agendamento erro:", e);
    return res.status(500).json({ error: e?.message || "Erro ao gerar cobrança" });
  }
});

router.get("/pagamento/:asaasPaymentId/status", requireAuth, async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const asaasPaymentId = req.params.asaasPaymentId;
    const refreshed = await refreshPagamentoStatus(asaasPaymentId);
    if (!refreshed) return res.json({ paid: false, pagamento: null });
    if (refreshed.barbeariaId !== barbeariaId) return res.status(403).json({ error: "Sem acesso" });
    return res.json({ paid: isPaidStatus(refreshed.status), pagamento: formatPagamento(refreshed) });
  } catch (e: any) {
    console.error("[asaas/comanda] status pagamento erro:", e);
    return res.status(500).json({ error: "Erro ao consultar status" });
  }
});

function formatPagamento(p: any) {
  return {
    id: p.id,
    asaasPaymentId: p.asaasPaymentId,
    billingType: p.billingType,
    valor: typeof p.valor === "string" ? parseFloat(p.valor) : p.valor,
    status: p.status,
    pixQrCodeBase64: p.pixQrCodeBase64,
    pixCopyPaste: p.pixCopyPaste,
    pixExpiraEm: p.pixExpiraEm?.toISOString?.() || p.pixExpiraEm,
    bankSlipUrl: p.bankSlipUrl,
    invoiceUrl: p.invoiceUrl,
    dueDate: p.dueDate,
  };
}

export default router;
