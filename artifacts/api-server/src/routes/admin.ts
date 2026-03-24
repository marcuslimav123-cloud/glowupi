import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { superAdminsTable, barbeariasTable, usersTable, platformConfigTable, comandasTable } from "@workspace/db/schema";
import { eq, sql, desc, count } from "drizzle-orm";
import { verifyAdminPassword, createAdminSession, deleteAdminSession, requireAdmin } from "../lib/adminAuth.js";

const router: IRouter = Router();

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "Email e senha obrigatórios" });

  const [admin] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.email, email)).limit(1);
  if (!admin || !admin.ativo) return res.status(401).json({ error: "Credenciais inválidas" });

  const valid = await verifyAdminPassword(senha, admin.senhaHash);
  if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = createAdminSession(admin.id);
  res.cookie("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });

  return res.json({ id: admin.id, nome: admin.nome, email: admin.email });
});

router.post("/logout", requireAdmin, (req: any, res) => {
  deleteAdminSession(req.adminToken);
  res.clearCookie("admin_session");
  return res.json({ success: true });
});

router.get("/me", requireAdmin, (req: any, res) => {
  const { id, nome, email } = req.admin;
  return res.json({ id, nome, email });
});

router.get("/dashboard", requireAdmin, async (_req, res) => {
  const allBarbearias = await db.select().from(barbeariasTable);
  const totalStudios = allBarbearias.length;
  const activeSubscriptions = allBarbearias.filter(b => b.subscriptionStatus === "active" || b.subscriptionStatus === "ativo").length;
  const trialUsers = allBarbearias.filter(b => b.subscriptionStatus === "trial" || !b.subscriptionStatus).length;
  const canceledUsers = allBarbearias.filter(b => b.subscriptionStatus === "canceled" || b.subscriptionStatus === "cancelado").length;
  const churnRate = totalStudios > 0 ? ((canceledUsers / totalStudios) * 100).toFixed(1) : "0";

  const recentSignups = allBarbearias
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    .slice(0, 10)
    .map(b => ({
      id: b.id,
      nome: b.nome,
      subscriptionStatus: b.subscriptionStatus || "trial",
      subscriptionPlan: b.subscriptionPlan,
      createdAt: b.createdAt?.toISOString(),
    }));

  const monthlyRevenue: Record<string, number> = {};
  const comandas = await db.select({
    mesAno: comandasTable.mesAno,
    total: sql<string>`COALESCE(SUM(CAST(${comandasTable.valorTotal} AS NUMERIC)), 0)`,
  }).from(comandasTable).groupBy(comandasTable.mesAno);

  for (const c of comandas) {
    monthlyRevenue[c.mesAno] = parseFloat(c.total);
  }

  const planDistribution: Record<string, number> = {};
  for (const b of allBarbearias) {
    const plan = b.subscriptionPlan || "Trial";
    planDistribution[plan] = (planDistribution[plan] || 0) + 1;
  }

  return res.json({
    totalStudios,
    activeSubscriptions,
    trialUsers,
    canceledUsers,
    churnRate: parseFloat(churnRate),
    recentSignups,
    monthlyRevenue,
    planDistribution,
  });
});

router.get("/tenants", requireAdmin, async (_req, res) => {
  const barbearias = await db
    .select({
      id: barbeariasTable.id,
      nome: barbeariasTable.nome,
      slug: barbeariasTable.slug,
      email: barbeariasTable.email,
      telefone: barbeariasTable.telefone,
      cidade: barbeariasTable.cidade,
      uf: barbeariasTable.uf,
      subscriptionStatus: barbeariasTable.subscriptionStatus,
      subscriptionPlan: barbeariasTable.subscriptionPlan,
      subscriptionPeriod: barbeariasTable.subscriptionPeriod,
      stripeCustomerId: barbeariasTable.stripeCustomerId,
      ativo: barbeariasTable.ativo,
      createdAt: barbeariasTable.createdAt,
      donoId: barbeariasTable.donoId,
    })
    .from(barbeariasTable)
    .orderBy(desc(barbeariasTable.createdAt));

  const donoIds = [...new Set(barbearias.map(b => b.donoId))];
  const owners = donoIds.length > 0
    ? await db.select({ id: usersTable.id, nome: usersTable.nome, email: usersTable.email }).from(usersTable).where(sql`${usersTable.id} IN (${sql.join(donoIds.map(id => sql`${id}`), sql`, `)})`)
    : [];
  const ownerMap = new Map(owners.map(o => [o.id, o]));

  return res.json(barbearias.map(b => ({
    ...b,
    createdAt: b.createdAt?.toISOString(),
    dono: ownerMap.get(b.donoId) || null,
  })));
});

router.put("/tenants/:id/toggle", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, id)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "Estúdio não encontrado" });

  const [updated] = await db.update(barbeariasTable).set({
    ativo: !barbearia.ativo,
    updatedAt: new Date(),
  }).where(eq(barbeariasTable.id, id)).returning();

  return res.json({ id: updated.id, ativo: updated.ativo });
});

router.get("/config", requireAdmin, async (_req, res) => {
  const configs = await db.select().from(platformConfigTable);
  const configMap: Record<string, string> = {};
  for (const c of configs) {
    configMap[c.chave] = c.valor;
  }
  return res.json(configMap);
});

router.put("/config", requireAdmin, async (req, res) => {
  const { chave, valor } = req.body;
  if (!chave || valor === undefined) return res.status(400).json({ error: "chave e valor obrigatórios" });

  const [existing] = await db.select().from(platformConfigTable).where(eq(platformConfigTable.chave, chave)).limit(1);
  if (existing) {
    await db.update(platformConfigTable).set({ valor, updatedAt: new Date() }).where(eq(platformConfigTable.chave, chave));
  } else {
    await db.insert(platformConfigTable).values({ chave, valor });
  }

  return res.json({ success: true, chave, valor });
});

router.get("/revenue", requireAdmin, async (_req, res) => {
  const barbearias = await db.select().from(barbeariasTable);

  const statusBreakdown: Record<string, number> = {};
  const planBreakdown: Record<string, number> = {};
  const periodBreakdown: Record<string, number> = {};

  for (const b of barbearias) {
    const status = b.subscriptionStatus || "trial";
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

    const plan = b.subscriptionPlan || "Trial";
    planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;

    if (b.subscriptionPeriod) {
      periodBreakdown[b.subscriptionPeriod] = (periodBreakdown[b.subscriptionPeriod] || 0) + 1;
    }
  }

  const monthlyComandas = await db.select({
    mesAno: comandasTable.mesAno,
    total: sql<string>`COALESCE(SUM(CAST(${comandasTable.valorTotal} AS NUMERIC)), 0)`,
    count: sql<string>`COUNT(*)`,
  }).from(comandasTable).groupBy(comandasTable.mesAno).orderBy(comandasTable.mesAno);

  const revenueByMonth = monthlyComandas.map(c => ({
    mesAno: c.mesAno,
    total: parseFloat(c.total),
    count: parseInt(c.count),
  }));

  return res.json({
    totalStudios: barbearias.length,
    statusBreakdown,
    planBreakdown,
    periodBreakdown,
    revenueByMonth,
  });
});

export default router;
