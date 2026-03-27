import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contasFinanceirasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccessDono as checkAccess } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function formatConta(c: any) {
  return { ...c, valor: parseFloat(c.valor), createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt };
}

async function processarBaixaAutomatica(barbeariaId: number) {
  const params = await getParametros(barbeariaId);
  if (params["financeiro_baixa_automatica"] !== "Habilitado") return;
  const hoje = new Date().toISOString().slice(0, 10);
  const contas = await db.select().from(contasFinanceirasTable).where(
    and(eq(contasFinanceirasTable.barbeariaId, barbeariaId), eq(contasFinanceirasTable.tipo, "receber"), eq(contasFinanceirasTable.status, "pendente"))
  );
  for (const conta of contas) {
    if (conta.dataVencimento && conta.dataVencimento <= hoje) {
      await db.update(contasFinanceirasTable).set({
        status: "paga",
        dataPagamento: hoje,
        updatedAt: new Date(),
      }).where(eq(contasFinanceirasTable.id, conta.id));
    }
  }
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await processarBaixaAutomatica(barbeariaId);
  const contas = await db.select().from(contasFinanceirasTable).where(eq(contasFinanceirasTable.barbeariaId, barbeariaId));
  res.json(contas.map(formatConta));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { tipo, categoria, descricao, valor, dataVencimento, dataPagamento, status, recorrente, observacao } = req.body;
  const [conta] = await db.insert(contasFinanceirasTable).values({
    barbeariaId, tipo, categoria, descricao, valor: String(valor), dataVencimento, dataPagamento, status, recorrente, observacao
  }).returning();
  res.status(201).json(formatConta(conta));
});

router.put("/:contaId/baixa", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const contaId = parseInt(req.params.contaId);
  const { dataPagamento, formaPagamento } = req.body;
  if (!dataPagamento) return res.status(400).json({ error: "Data de pagamento é obrigatória" });
  const [conta] = await db.update(contasFinanceirasTable).set({
    status: "paga",
    dataPagamento,
    formaPagamento: formaPagamento || null,
    updatedAt: new Date(),
  }).where(and(eq(contasFinanceirasTable.id, contaId), eq(contasFinanceirasTable.barbeariaId, barbeariaId))).returning();
  if (!conta) return res.status(404).json({ error: "Conta não encontrada" });
  res.json(formatConta(conta));
});

router.put("/:contaId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const contaId = parseInt(req.params.contaId);
  const { tipo, categoria, descricao, valor, dataVencimento, dataPagamento, formaPagamento, status, recorrente, observacao } = req.body;
  const updates: any = {};
  if (tipo !== undefined) updates.tipo = tipo;
  if (categoria !== undefined) updates.categoria = categoria;
  if (descricao !== undefined) updates.descricao = descricao;
  if (valor !== undefined) updates.valor = String(valor);
  if (dataVencimento !== undefined) updates.dataVencimento = dataVencimento;
  if (dataPagamento !== undefined) updates.dataPagamento = dataPagamento;
  if (formaPagamento !== undefined) updates.formaPagamento = formaPagamento;
  if (status !== undefined) updates.status = status;
  if (recorrente !== undefined) updates.recorrente = recorrente;
  if (observacao !== undefined) updates.observacao = observacao;
  updates.updatedAt = new Date();
  const [conta] = await db.update(contasFinanceirasTable).set(updates).where(and(eq(contasFinanceirasTable.id, contaId), eq(contasFinanceirasTable.barbeariaId, barbeariaId))).returning();
  if (!conta) return res.status(404).json({ error: "Conta não encontrada" });
  res.json(formatConta(conta));
});

router.delete("/:contaId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const contaId = parseInt(req.params.contaId);
  await db.delete(contasFinanceirasTable).where(and(eq(contasFinanceirasTable.id, contaId), eq(contasFinanceirasTable.barbeariaId, barbeariaId)));
  res.json({ ok: true });
});

export default router;
