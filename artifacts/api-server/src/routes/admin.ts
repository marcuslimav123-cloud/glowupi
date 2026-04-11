import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { superAdminsTable, barbeariasTable, usersTable, platformConfigTable, comandasTable, brevoEmailLogTable, profissionaisTable, adminLogsTable, lgpdConsentsTable } from "@workspace/db/schema";
import { eq, sql, desc, count, and, gte } from "drizzle-orm";
import { verifyAdminPassword, createAdminSession, deleteAdminSession, requireAdmin } from "../lib/adminAuth.js";
import { getEmailStats } from "../lib/brevo.js";

const PLAN_MONTHLY_PRICES: Record<string, Record<string, number>> = {
  "1 Pro": { mensal: 79.90, semestral: 67.80, anual: 55.90 },
  "2-5 Pro": { mensal: 109.90, semestral: 93.30, anual: 76.90 },
  "6-15 Pro": { mensal: 164.50, semestral: 139.80, anual: 115.15 },
  "+15 Pro": { mensal: 219.90, semestral: 186.80, anual: 153.90 },
  "single": { mensal: 97.00, semestral: 97.00, anual: 97.00 },
};

const PLAN_PROFESSIONAL_LIMITS: Record<string, number> = {
  "1 Pro": 1,
  "2-5 Pro": 5,
  "6-15 Pro": 15,
  "+15 Pro": 999,
  "single": 999,
  "trial": 5,
};

function computeMrr(barbearias: any[]): number {
  let mrr = 0;
  for (const b of barbearias) {
    if (b.subscriptionStatus !== "active" && b.subscriptionStatus !== "ativo") continue;
    const plan = b.subscriptionPlan || "";
    const period = b.subscriptionPeriod || "mensal";
    const prices = PLAN_MONTHLY_PRICES[plan];
    if (prices) {
      mrr += prices[period] || prices.mensal || 0;
    }
  }
  return Math.round(mrr * 100) / 100;
}

async function logAdminAction(adminId: number, acao: string, barbeariaId?: number, detalhes?: any) {
  try {
    await db.insert(adminLogsTable).values({
      adminId,
      acao,
      barbeariaId: barbeariaId || null,
      detalhes: detalhes || null,
    });
  } catch (e) {
    console.error("Failed to log admin action:", e);
  }
}

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

  await logAdminAction(admin.id, "login");
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

  const mrr = computeMrr(allBarbearias);
  const arr = mrr * 12;

  return res.json({
    totalStudios,
    activeSubscriptions,
    trialUsers,
    canceledUsers,
    churnRate: parseFloat(churnRate),
    mrr,
    arr,
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
      planoVencimento: barbeariasTable.planoVencimento,
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

  const proCounts = await db.select({
    barbeariaId: profissionaisTable.barbeariaId,
    total: sql<string>`COUNT(*)`,
  }).from(profissionaisTable).where(eq(profissionaisTable.ativo, true)).groupBy(profissionaisTable.barbeariaId);
  const proCountMap = new Map(proCounts.map(p => [p.barbeariaId, parseInt(p.total)]));

  const now = new Date();

  return res.json(barbearias.map(b => {
    const plan = b.subscriptionPlan || "trial";
    const limit = PLAN_PROFESSIONAL_LIMITS[plan] || 5;
    const proCount = proCountMap.get(b.id) || 0;

    let diasRestantes: number | null = null;
    if (b.planoVencimento) {
      diasRestantes = Math.max(0, Math.ceil((b.planoVencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const createdDate = b.createdAt || now;
    const diffMs = now.getTime() - createdDate.getTime();
    const mesesAcesso = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    const anosAcesso = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

    return {
      ...b,
      planoVencimento: b.planoVencimento?.toISOString() || null,
      createdAt: b.createdAt?.toISOString(),
      dono: ownerMap.get(b.donoId) || null,
      proCount,
      proLimit: limit,
      diasRestantes,
      mesesAcesso,
      anosAcesso,
    };
  }));
});

router.put("/tenants/:id/toggle", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, id)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "Estúdio não encontrado" });

  const [updated] = await db.update(barbeariasTable).set({
    ativo: !barbearia.ativo,
    updatedAt: new Date(),
  }).where(eq(barbeariasTable.id, id)).returning();

  await logAdminAction(req.admin.id, updated.ativo ? "ativar_tenant" : "desativar_tenant", id, {
    nome: barbearia.nome,
    anteriorAtivo: barbearia.ativo,
    novoAtivo: updated.ativo,
  });

  return res.json({ id: updated.id, ativo: updated.ativo });
});

router.put("/tenants/:id/status", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const validStatuses = ["trial", "pendente", "ativo", "inativo", "suspenso", "cancelado", "inadimplente"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Valores aceitos: ${validStatuses.join(", ")}` });
  }

  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, id)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "Estúdio não encontrado" });

  const updates: any = {
    subscriptionStatus: status,
    planoStatus: status,
    updatedAt: new Date(),
  };

  if (status === "inativo") {
    updates.ativo = false;
  } else if (status === "ativo" || status === "trial") {
    updates.ativo = true;
  }

  const [updated] = await db.update(barbeariasTable).set(updates).where(eq(barbeariasTable.id, id)).returning();

  await logAdminAction(req.admin.id, "mudar_status", id, {
    nome: barbearia.nome,
    anterior: barbearia.subscriptionStatus,
    novo: status,
  });

  return res.json({ id: updated.id, subscriptionStatus: updated.subscriptionStatus, ativo: updated.ativo });
});

router.put("/tenants/:id/dates", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const { planoVencimento, diasExtras } = req.body;

  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, id)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "Estúdio não encontrado" });

  let newDate: Date;
  if (diasExtras && typeof diasExtras === "number") {
    const base = barbearia.planoVencimento || new Date();
    newDate = new Date(base.getTime() + diasExtras * 24 * 60 * 60 * 1000);
  } else if (planoVencimento) {
    newDate = new Date(planoVencimento);
  } else {
    return res.status(400).json({ error: "Informe planoVencimento ou diasExtras" });
  }

  const [updated] = await db.update(barbeariasTable).set({
    planoVencimento: newDate,
    updatedAt: new Date(),
  }).where(eq(barbeariasTable.id, id)).returning();

  await logAdminAction(req.admin.id, "ajustar_datas", id, {
    nome: barbearia.nome,
    anterior: barbearia.planoVencimento?.toISOString(),
    novo: newDate.toISOString(),
    diasExtras: diasExtras || null,
  });

  return res.json({ id: updated.id, planoVencimento: updated.planoVencimento?.toISOString() });
});

router.get("/tenants/:id/logs", requireAdmin, async (req, res) => {
  const barbeariaId = parseInt(req.params.id);
  const logs = await db.select().from(adminLogsTable)
    .where(eq(adminLogsTable.barbeariaId, barbeariaId))
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(100);
  return res.json(logs.map(l => ({ ...l, createdAt: l.createdAt?.toISOString() })));
});

router.get("/logs", requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const logs = await db.select({
    id: adminLogsTable.id,
    adminId: adminLogsTable.adminId,
    acao: adminLogsTable.acao,
    barbeariaId: adminLogsTable.barbeariaId,
    detalhes: adminLogsTable.detalhes,
    createdAt: adminLogsTable.createdAt,
  }).from(adminLogsTable)
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(limit);

  return res.json(logs.map(l => ({ ...l, createdAt: l.createdAt?.toISOString() })));
});

router.get("/config", requireAdmin, async (_req, res) => {
  const configs = await db.select().from(platformConfigTable);
  const configMap: Record<string, string> = {};
  for (const c of configs) {
    configMap[c.chave] = c.valor;
  }
  return res.json(configMap);
});

router.put("/config", requireAdmin, async (req: any, res) => {
  const { chave, valor } = req.body;
  if (!chave || valor === undefined) return res.status(400).json({ error: "chave e valor obrigatórios" });

  if (chave === "trial_days") {
    const days = parseInt(valor);
    if (isNaN(days) || days < 1 || days > 90) {
      return res.status(400).json({ error: "Dias de teste deve ser entre 1 e 90" });
    }
  }

  const [existing] = await db.select().from(platformConfigTable).where(eq(platformConfigTable.chave, chave)).limit(1);
  if (existing) {
    await db.update(platformConfigTable).set({ valor, updatedAt: new Date() }).where(eq(platformConfigTable.chave, chave));
  } else {
    await db.insert(platformConfigTable).values({ chave, valor });
  }

  await logAdminAction(req.admin.id, "alterar_config", undefined, { chave, valor });
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

  const mrr = computeMrr(barbearias);
  const arr = mrr * 12;

  const mrrByPlan: Record<string, number> = {};
  for (const b of barbearias) {
    if (b.subscriptionStatus !== "active" && b.subscriptionStatus !== "ativo") continue;
    const plan = b.subscriptionPlan || "unknown";
    const period = b.subscriptionPeriod || "mensal";
    const prices = PLAN_MONTHLY_PRICES[plan];
    if (prices) {
      mrrByPlan[plan] = (mrrByPlan[plan] || 0) + (prices[period] || prices.mensal || 0);
    }
  }

  return res.json({
    totalStudios: barbearias.length,
    mrr,
    arr,
    mrrByPlan,
    statusBreakdown,
    planBreakdown,
    periodBreakdown,
    revenueByMonth,
  });
});

router.get("/email-stats", requireAdmin, async (req, res) => {
  try {
    const stats = await getEmailStats();

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dia = d.toISOString().split("T")[0];
      const logs = await db.select().from(brevoEmailLogTable).where(eq(brevoEmailLogTable.dia, dia));
      const total = logs.reduce((sum, l) => sum + l.contagem, 0);
      last7.push({ dia, total, contas: logs.map(l => ({ keyIndex: l.keyIndex, contagem: l.contagem })) });
    }

    return res.json({ hoje: stats, historico: last7 });
  } catch (e) {
    console.error("email-stats error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/lgpd-consents", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    const consents = await db
      .select({
        id: lgpdConsentsTable.id,
        userId: lgpdConsentsTable.userId,
        tipo: lgpdConsentsTable.tipo,
        ipAddress: lgpdConsentsTable.ipAddress,
        userAgent: lgpdConsentsTable.userAgent,
        acceptedAt: lgpdConsentsTable.acceptedAt,
        userName: usersTable.nome,
        userEmail: usersTable.email,
      })
      .from(lgpdConsentsTable)
      .leftJoin(usersTable, eq(lgpdConsentsTable.userId, usersTable.id))
      .orderBy(desc(lgpdConsentsTable.acceptedAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: count() }).from(lgpdConsentsTable);

    return res.json({
      consents: consents.map(c => ({
        ...c,
        acceptedAt: c.acceptedAt?.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error("lgpd-consents error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
