import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { comissoesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import { sendPushToBarbearia } from "../lib/pushNotifications.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return { ...r, valorBase: parseFloat(r.valorBase), percentual: parseFloat(r.percentual), valorComissao: parseFloat(r.valorComissao), createdAt: r.createdAt?.toISOString?.() ?? r.createdAt };
}

router.get("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { mesAno, profissionalId, status } = req.query;
  const conditions = [eq(comissoesTable.barbeariaId, barbeariaId)];
  if (mesAno) conditions.push(eq(comissoesTable.mesAno, mesAno as string));
  if (profissionalId) conditions.push(eq(comissoesTable.profissionalId, parseInt(profissionalId as string)));
  if (status) conditions.push(eq(comissoesTable.status, status as string));
  const rows = await db.select().from(comissoesTable).where(and(...conditions));
  res.json(rows.map(fmt));
});

router.post("/", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { profissionalId, profissionalNome, comandaId, mesAno, valorBase, percentual, valorComissao, status, dataPagamento } = req.body;
  const insertVals: any = {
    barbeariaId, profissionalId, profissionalNome, comandaId, mesAno,
    valorBase: String(valorBase), percentual: String(percentual), valorComissao: String(valorComissao),
    status: status || "pendente",
  };
  if (dataPagamento) insertVals.dataPagamento = dataPagamento;
  const [row] = await db.insert(comissoesTable).values(insertVals).returning();
  res.status(201).json(fmt(row));
});

router.put("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  const { status, dataPagamento, valorComissao, percentual } = req.body;
  if (status !== undefined) updates.status = status;
  if (dataPagamento !== undefined) updates.dataPagamento = dataPagamento;
  if (valorComissao !== undefined) updates.valorComissao = String(valorComissao);
  if (percentual !== undefined) updates.percentual = String(percentual);
  const [row] = await db.update(comissoesTable).set(updates).where(and(eq(comissoesTable.id, id), eq(comissoesTable.barbeariaId, barbeariaId))).returning();
  if (!row) return res.status(404).json({ error: "Comissão não encontrada" });

  if (status === "paga") {
    sendPushToBarbearia(barbeariaId, {
      title: "Comissão liberada",
      body: `${row.profissionalNome} — R$ ${Number(row.valorComissao || 0).toFixed(2).replace(".", ",")} (${row.mesAno})`,
      data: { type: "comissao_paga", comissaoId: row.id, profissionalId: row.profissionalId, url: "/financeiro/comissoes" },
    }).catch(err => console.error("[Push] Error on comissao paga:", err));
  }

  res.json(fmt(row));
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(comissoesTable).where(and(eq(comissoesTable.id, parseInt(req.params.id)), eq(comissoesTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
