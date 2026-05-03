import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pacotesTable, pacotesClienteTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { createPaymentForBarbearia, refreshPagamentoStatus, getContaByBarbearia, isPaidStatus, processPagamentoPago } from "../lib/asaasService.js";
import { db as dbInstance } from "@workspace/db";
import { pagamentosAsaasTable } from "@workspace/db/schema";

const router: IRouter = Router({ mergeParams: true });

router.post("/cobrar", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const { pacoteId, clienteId, clienteNome, clienteTelefone, payerCpfCnpj, billingType } = req.body || {};
    if (!pacoteId) return res.status(400).json({ error: "pacoteId é obrigatório" });
    if (!clienteNome) return res.status(400).json({ error: "clienteNome é obrigatório" });
    const tipo = (billingType === "BOLETO" || billingType === "CREDIT_CARD") ? billingType : "PIX";

    const [pacote] = await db.select().from(pacotesTable).where(
      and(eq(pacotesTable.id, Number(pacoteId)), eq(pacotesTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!pacote) return res.status(404).json({ error: "Pacote não encontrado" });
    if (!pacote.ativo) return res.status(400).json({ error: "Pacote inativo" });

    const conta = await getContaByBarbearia(barbeariaId);
    if (!conta) return res.status(503).json({ error: "Conta de pagamento não conectada" });

    const valor = parseFloat(String(pacote.preco || "0"));
    if (valor <= 0) return res.status(400).json({ error: "Valor inválido" });

    const due = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

    const result = await createPaymentForBarbearia({
      barbeariaId,
      tipo: "pacote_cliente",
      refType: "pacote_cliente",
      profissionalId: null,
      billingType: tipo,
      value: valor,
      dueDate: due,
      description: `Pacote: ${pacote.nome} — ${clienteNome}`,
      payer: { nome: clienteNome, telefone: clienteTelefone, cpfCnpj: payerCpfCnpj },
      externalReference: `pacote-${pacote.id}`,
    });

    // Persistir metadata para poder criar o pacotesCliente quando o pagamento for confirmado
    await dbInstance.update(pagamentosAsaasTable).set({
      metadata: { pacoteId: pacote.id, clienteId: clienteId ?? null, clienteNome },
    }).where(eq(pagamentosAsaasTable.id, result.pagamento.id));

    return res.status(201).json({
      pagamento: formatPagamento(result.pagamento),
      pacoteNome: pacote.nome,
    });
  } catch (e: any) {
    console.error("[asaas/pacote] cobrar erro:", e);
    return res.status(500).json({ error: e?.message || "Erro ao gerar cobrança" });
  }
});

router.get("/pagamento/:asaasPaymentId/status", requireAuth, async (req: any, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const refreshed = await refreshPagamentoStatus(req.params.asaasPaymentId);
    if (!refreshed) return res.json({ paid: false, pagamento: null });
    if (refreshed.barbeariaId !== barbeariaId) return res.status(403).json({ error: "Sem acesso" });
    if (isPaidStatus(refreshed.status)) {
      await processPagamentoPago(barbeariaId, refreshed);
    }
    return res.json({ paid: isPaidStatus(refreshed.status), pagamento: formatPagamento(refreshed) });
  } catch (e: any) {
    console.error("[asaas/pacote] status erro:", e);
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
