import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agendamentosTable, barbeariasTable, pagamentosAsaasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { createPaymentForBarbearia, refreshPagamentoStatus, getContaByBarbearia, isPaidStatus } from "../lib/asaasService.js";

const router: IRouter = Router();

function calcularSinalValor(barbearia: any, valorServico: number): number {
  const modo = barbearia.sinalModo || "percentual";
  const v = parseFloat(String(barbearia.sinalValor || "0"));
  if (modo === "valor") return Math.max(0.5, v);
  return Math.max(0.5, Number(((valorServico * v) / 100).toFixed(2)));
}

router.post("/agendamento/:agendamentoId", async (req, res) => {
  try {
    const agendamentoId = parseInt(req.params.agendamentoId);
    const { billingType, clienteTelefone } = req.body || {};
    const tipo = (billingType === "BOLETO" || billingType === "CREDIT_CARD") ? billingType : "PIX";

    const [agend] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendamentoId)).limit(1);
    if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

    const telLimpo = String(clienteTelefone || "").replace(/\D/g, "");
    const telAgend = String(agend.clienteTelefone || "").replace(/\D/g, "");
    if (!telLimpo || !telAgend || telLimpo.slice(-10) !== telAgend.slice(-10)) {
      return res.status(401).json({ error: "Validação de posse necessária (clienteTelefone)" });
    }

    const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, agend.barbeariaId)).limit(1);
    if (!barb) return res.status(404).json({ error: "Barbearia não encontrada" });
    if (!barb.prePagamentoAtivo) {
      return res.status(400).json({ error: "Pré-pagamento não está ativo nesta barbearia" });
    }

    const conta = await getContaByBarbearia(agend.barbeariaId);
    if (!conta) {
      return res.status(503).json({ error: "Esta barbearia ainda não conectou uma conta de pagamento" });
    }

    if (agend.sinalAsaasPaymentId) {
      const refreshed = await refreshPagamentoStatus(agend.sinalAsaasPaymentId);
      if (refreshed) {
        return res.json(formatPagamento(refreshed));
      }
    }

    const valorServico = parseFloat(String(agend.valor || "0"));
    const sinalValor = calcularSinalValor(barb, valorServico);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const result = await createPaymentForBarbearia({
      barbeariaId: agend.barbeariaId,
      tipo: "agendamento",
      refType: "agendamento",
      refId: agend.id,
      profissionalId: agend.profissionalId ?? null,
      billingType: tipo,
      value: sinalValor,
      dueDate: dueDate.toISOString().slice(0, 10),
      description: `Sinal — ${agend.servicoNome} com ${agend.profissionalNome} (${agend.data} ${agend.horaInicio})`,
      payer: {
        nome: agend.clienteNome,
        telefone: agend.clienteTelefone,
      },
      externalReference: `agend-${agend.id}`,
    });

    await db.update(agendamentosTable).set({
      sinalStatus: "aguardando",
      sinalValorDevido: String(sinalValor),
      sinalAsaasPaymentId: result.pagamento.asaasPaymentId,
      sinalInformadoEm: new Date(),
      sinalExpiraEm: result.pixData?.expirationDate ? new Date(result.pixData.expirationDate) : null,
      updatedAt: new Date(),
    }).where(eq(agendamentosTable.id, agendamentoId));

    return res.status(201).json(formatPagamento(result.pagamento));
  } catch (e: any) {
    console.error("[asaas/sinal] criar erro:", e);
    return res.status(500).json({ error: e?.message || "Erro ao gerar sinal" });
  }
});

router.get("/agendamento/:agendamentoId/status", async (req, res) => {
  try {
    const agendamentoId = parseInt(req.params.agendamentoId);
    const [agend] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendamentoId)).limit(1);
    if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });
    if (!agend.sinalAsaasPaymentId) {
      return res.json({ status: agend.sinalStatus, paid: false });
    }
    const refreshed = await refreshPagamentoStatus(agend.sinalAsaasPaymentId);
    if (!refreshed) return res.json({ status: agend.sinalStatus, paid: false });
    if (isPaidStatus(refreshed.status)) {
      await db.update(agendamentosTable).set({
        sinalStatus: "pago",
        sinalConfirmadoEm: agend.sinalConfirmadoEm || new Date(),
        sinalValorPago: refreshed.valor,
        pago: true,
        updatedAt: new Date(),
      }).where(eq(agendamentosTable.id, agendamentoId));
      return res.json({ status: "pago", paid: true });
    }
    return res.json({ status: agend.sinalStatus, paid: false });
  } catch (e: any) {
    console.error("[asaas/sinal] status erro:", e);
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
