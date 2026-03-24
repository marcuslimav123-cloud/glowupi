import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contasFinanceirasTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

async function checkAccess(req: any, res: any): Promise<number | null> {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) { res.status(400).json({ error: "ID inválido" }); return null; }
  const [b] = await db.select().from(barbeariasTable).where(and(eq(barbeariasTable.id, barbeariaId), eq(barbeariasTable.donoId, req.user.id))).limit(1);
  if (!b) { res.status(403).json({ error: "Acesso negado" }); return null; }
  return barbeariaId;
}

function formatConta(c: any) {
  return { ...c, valor: parseFloat(c.valor), createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
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

router.put("/:contaId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const contaId = parseInt(req.params.contaId);
  const { tipo, categoria, descricao, valor, dataVencimento, dataPagamento, status, recorrente, observacao } = req.body;
  const updates: any = {};
  if (tipo !== undefined) updates.tipo = tipo;
  if (categoria !== undefined) updates.categoria = categoria;
  if (descricao !== undefined) updates.descricao = descricao;
  if (valor !== undefined) updates.valor = String(valor);
  if (dataVencimento !== undefined) updates.dataVencimento = dataVencimento;
  if (dataPagamento !== undefined) updates.dataPagamento = dataPagamento;
  if (status !== undefined) updates.status = status;
  if (recorrente !== undefined) updates.recorrente = recorrente;
  if (observacao !== undefined) updates.observacao = observacao;
  updates.updatedAt = new Date();
  const [conta] = await db.update(contasFinanceirasTable).set(updates).where(and(eq(contasFinanceirasTable.id, contaId), eq(contasFinanceirasTable.barbeariaId, barbeariaId))).returning();
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
