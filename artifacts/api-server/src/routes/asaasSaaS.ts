import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { assinaturasAsaasTable, barbeariasTable, pagamentosAsaasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireBarbearia } from "../lib/auth.js";
import { platformAsaasClient } from "../lib/asaasClient.js";

const router: IRouter = Router();

const PLANOS: Record<string, { nome: string; valor: number }> = {
  "1_pro": { nome: "Glow Upi 1 Pro", valor: 49.90 },
  "2_5_pro": { nome: "Glow Upi 2-5 Pro", valor: 99.90 },
  "6_15_pro": { nome: "Glow Upi 6-15 Pro", valor: 199.90 },
  "15_plus_pro": { nome: "Glow Upi 15+ Pro", valor: 299.90 },
};

router.get("/planos", (_req, res) => {
  res.json(Object.entries(PLANOS).map(([id, p]) => ({ id, ...p })));
});

router.get("/", requireAuth, requireBarbearia, async (req: any, res) => {
  const barbearia = req.barbearia;
  const [a] = await db.select().from(assinaturasAsaasTable).where(eq(assinaturasAsaasTable.barbeariaId, barbearia.id)).limit(1);
  if (!a) return res.json({ assinatura: null });
  return res.json({ assinatura: format(a) });
});

router.post("/", requireAuth, requireBarbearia, async (req: any, res) => {
  try {
    const barbearia = req.barbearia;
    const { plano, billingType, payerCpfCnpj, payerEmail } = req.body || {};
    if (!plano || !PLANOS[plano]) return res.status(400).json({ error: "Plano inválido" });
    const tipo = (billingType === "PIX" || billingType === "BOLETO" || billingType === "CREDIT_CARD") ? billingType : "PIX";
    const planInfo = PLANOS[plano];

    const client = platformAsaasClient();

    const customer = await client.upsertCustomer({
      name: barbearia.nome,
      email: payerEmail || barbearia.email,
      mobilePhone: barbearia.telefone,
      cpfCnpj: payerCpfCnpj,
      externalReference: `barb-${barbearia.id}`,
    });

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    const subscription = await client.createSubscription({
      customer: customer.id,
      billingType: tipo,
      value: planInfo.valor,
      nextDueDate: nextDueDate.toISOString().slice(0, 10),
      cycle: "MONTHLY",
      description: `Assinatura ${planInfo.nome}`,
      externalReference: `barb-${barbearia.id}-${plano}`,
    });

    const [existing] = await db.select().from(assinaturasAsaasTable).where(eq(assinaturasAsaasTable.barbeariaId, barbearia.id)).limit(1);
    let assinatura;
    if (existing) {
      [assinatura] = await db.update(assinaturasAsaasTable).set({
        asaasCustomerId: customer.id,
        asaasSubscriptionId: subscription.id,
        plano, periodo: "mensal",
        valor: String(planInfo.valor), billingType: tipo,
        status: "PENDING", proximoVencimento: subscription.nextDueDate || null,
        updatedAt: new Date(),
      }).where(eq(assinaturasAsaasTable.id, existing.id)).returning();
    } else {
      [assinatura] = await db.insert(assinaturasAsaasTable).values({
        barbeariaId: barbearia.id,
        asaasCustomerId: customer.id,
        asaasSubscriptionId: subscription.id,
        plano, periodo: "mensal",
        valor: String(planInfo.valor), billingType: tipo,
        status: "PENDING", proximoVencimento: subscription.nextDueDate || null,
      }).returning();
    }

    return res.status(201).json({ assinatura: format(assinatura), subscription });
  } catch (e: any) {
    console.error("[asaas/saas] criar erro:", e);
    return res.status(500).json({ error: e?.message || "Erro ao criar assinatura" });
  }
});

router.delete("/", requireAuth, requireBarbearia, async (req: any, res) => {
  try {
    const barbearia = req.barbearia;
    const [a] = await db.select().from(assinaturasAsaasTable).where(eq(assinaturasAsaasTable.barbeariaId, barbearia.id)).limit(1);
    if (!a) return res.status(404).json({ error: "Assinatura não encontrada" });
    const client = platformAsaasClient();
    try { await client.cancelSubscription(a.asaasSubscriptionId); } catch (e) { console.error(e); }
    await db.update(assinaturasAsaasTable).set({ status: "CANCELLED", cancelaEm: new Date(), updatedAt: new Date() })
      .where(eq(assinaturasAsaasTable.id, a.id));
    return res.json({ success: true });
  } catch (e: any) {
    console.error("[asaas/saas] cancelar erro:", e);
    return res.status(500).json({ error: "Erro ao cancelar assinatura" });
  }
});

function format(a: any) {
  return {
    ...a,
    valor: parseFloat(a.valor),
    createdAt: a.createdAt?.toISOString?.() || a.createdAt,
    updatedAt: a.updatedAt?.toISOString?.() || a.updatedAt,
  };
}

export default router;
