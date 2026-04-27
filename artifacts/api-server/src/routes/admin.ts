import { Router, type IRouter } from "express";
import crypto from "crypto";
import multer from "multer";
import XLSX from "xlsx";
import { db } from "@workspace/db";
import { superAdminsTable, barbeariasTable, usersTable, platformConfigTable, comandasTable, brevoEmailLogTable, profissionaisTable, adminLogsTable, lgpdConsentsTable, trialLinksTable, clientesTable, servicosTable } from "@workspace/db/schema";
import { eq, sql, desc, count, and, gte, lt, isNull } from "drizzle-orm";
import { verifyAdminPassword, createAdminSession, deleteAdminSession, requireAdmin } from "../lib/adminAuth.js";
import { getEmailStats } from "../lib/brevo.js";

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

type ImportRowStatus = "novo" | "duplicado" | "erro";
interface ImportRow {
  linha: number;
  nome: string;
  preco: number | null;
  duracaoMinutos: number;
  descricao: string | null;
  status: ImportRowStatus;
  motivo: string | null;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function parsePrecoCell(raw: any): { value: number | null; error: string | null } {
  if (raw === undefined || raw === null || raw === "") {
    return { value: null, error: "Preço obrigatório" };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return { value: null, error: "Preço inválido" };
    return { value: Math.round(raw * 100) / 100, error: null };
  }
  let str = String(raw).trim();
  str = str.replace(/^R\$\s*/i, "").replace(/\s+/g, "");
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }
  const n = Number(str);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: "Preço inválido" };
  return { value: Math.round(n * 100) / 100, error: null };
}

function parseDuracaoCell(raw: any): { value: number; error: string | null } {
  if (raw === undefined || raw === null || raw === "") return { value: 30, error: null };
  const n = Number(typeof raw === "string" ? raw.replace(/[^0-9]/g, "") : raw);
  if (!Number.isFinite(n) || n < 1) return { value: 30, error: "Duração inválida (use 1 a 1440)" };
  if (n > 1440) return { value: 30, error: "Duração não pode exceder 1440 min (24h)" };
  return { value: Math.floor(n), error: null };
}

function pickRowField(row: any, candidates: string[]): any {
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    for (const cand of candidates) {
      if (norm === cand) return row[key];
    }
  }
  return undefined;
}

async function parseImportFile(buffer: Buffer, barbeariaId: number): Promise<{ rows: ImportRow[]; existingNames: Set<string> }> {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    throw new Error("Arquivo Excel inválido ou corrompido. Verifique se o arquivo é .xlsx válido.");
  }
  if (!wb.SheetNames || wb.SheetNames.length === 0) throw new Error("Planilha sem abas. Use o modelo fornecido.");

  const normalizeSheet = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  let sheetName = wb.SheetNames.find(n => normalizeSheet(n) === "servicos") || null;
  if (!sheetName) {
    const candidates = wb.SheetNames.filter(n => normalizeSheet(n) !== "instrucoes" && normalizeSheet(n) !== "instrucao");
    sheetName = candidates[0] || wb.SheetNames[0];
  }
  if (!sheetName) throw new Error("Aba 'Serviços' não encontrada na planilha.");
  const sheet = wb.Sheets[sheetName];
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

  const existing = await db
    .select({ nome: servicosTable.nome })
    .from(servicosTable)
    .where(eq(servicosTable.barbeariaId, barbeariaId));
  const existingNames = new Set(existing.map(s => normalizeName(s.nome)));

  const seenInFile = new Set<string>();
  const rows: ImportRow[] = json.map((raw: any, idx: number) => {
    const linha = idx + 2;
    const nomeRaw = pickRowField(raw, ["nome", "servico", "service", "nomedoservico", "nomedoservio"]);
    const precoRaw = pickRowField(raw, ["preco", "preo", "preco", "price", "valor"]);
    const duracaoRaw = pickRowField(raw, ["duracao", "durao", "duracaomin", "duraomin", "duracaominutos", "duraominutos", "minutos", "tempo"]);
    const descricaoRaw = pickRowField(raw, ["descricao", "descrio", "description", "desc"]);

    const nome = nomeRaw == null ? "" : String(nomeRaw).trim();
    const descricao = descricaoRaw == null || descricaoRaw === "" ? null : String(descricaoRaw).trim();

    if (!nome) {
      return { linha, nome: "", preco: null, duracaoMinutos: 30, descricao: null, status: "erro", motivo: "Nome obrigatório" };
    }
    const { value: preco, error: precoErr } = parsePrecoCell(precoRaw);
    if (precoErr) {
      return { linha, nome, preco: null, duracaoMinutos: 30, descricao, status: "erro", motivo: precoErr };
    }
    const { value: dur, error: durErr } = parseDuracaoCell(duracaoRaw);
    if (durErr) {
      return { linha, nome, preco, duracaoMinutos: dur, descricao, status: "erro", motivo: durErr };
    }

    const norm = normalizeName(nome);
    if (seenInFile.has(norm)) {
      return { linha, nome, preco, duracaoMinutos: dur, descricao, status: "erro", motivo: "Nome duplicado dentro da própria planilha" };
    }
    seenInFile.add(norm);

    if (existingNames.has(norm)) {
      return { linha, nome, preco, duracaoMinutos: dur, descricao, status: "duplicado", motivo: "Já existe esse serviço no estabelecimento" };
    }

    return { linha, nome, preco, duracaoMinutos: dur, descricao, status: "novo", motivo: null };
  });

  return { rows, existingNames };
}

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

router.post("/trial-links", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [link] = await db.insert(trialLinksTable).values({
      token,
      createdByAdminId: admin.id,
      trialDays: 7,
      expiresAt,
    }).returning();

    await logAdminAction(admin.id, "trial_link_created", undefined, { token, expiresAt: expiresAt.toISOString() });

    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + ".repl.co";
    const baseUrl = `https://${domain}`;
    return res.status(201).json({
      ...link,
      url: `${baseUrl}/trial/${token}`,
      createdAt: link.createdAt.toISOString(),
      expiresAt: link.expiresAt.toISOString(),
      usedAt: link.usedAt?.toISOString() || null,
    });
  } catch (e) {
    console.error("create trial link error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/trial-links", requireAdmin, async (req, res) => {
  try {
    const links = await db.select({
      id: trialLinksTable.id,
      token: trialLinksTable.token,
      trialDays: trialLinksTable.trialDays,
      used: trialLinksTable.used,
      usedAt: trialLinksTable.usedAt,
      usedByEmail: trialLinksTable.usedByEmail,
      usedByBarbeariaId: trialLinksTable.usedByBarbeariaId,
      expiresAt: trialLinksTable.expiresAt,
      createdAt: trialLinksTable.createdAt,
      adminNome: superAdminsTable.nome,
    })
    .from(trialLinksTable)
    .leftJoin(superAdminsTable, eq(trialLinksTable.createdByAdminId, superAdminsTable.id))
    .orderBy(desc(trialLinksTable.createdAt));

    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + ".repl.co";
    const baseUrl = `https://${domain}`;
    return res.json(links.map(l => ({
      ...l,
      url: `${baseUrl}/trial/${l.token}`,
      createdAt: l.createdAt?.toISOString(),
      expiresAt: l.expiresAt?.toISOString(),
      usedAt: l.usedAt?.toISOString() || null,
    })));
  } catch (e) {
    console.error("list trial links error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/export-clientes", requireAdmin, async (req: any, res) => {
  try {
    const allBarbearias = await db.select().from(barbeariasTable).orderBy(desc(barbeariasTable.createdAt));
    const allUsers = await db.select().from(usersTable);

    const userMap = new Map(allUsers.map(u => [u.id, u]));

    const proCounts = await db.select({
      barbeariaId: profissionaisTable.barbeariaId,
      total: sql<string>`COUNT(*)`,
    }).from(profissionaisTable).where(eq(profissionaisTable.ativo, true)).groupBy(profissionaisTable.barbeariaId);
    const proCountMap = new Map(proCounts.map(p => [p.barbeariaId, parseInt(p.total)]));

    const now = new Date();

    const data = allBarbearias.map(b => {
      const dono = userMap.get(b.donoId);
      const proCount = proCountMap.get(b.id) || 0;

      let diasRestantes: number | null = null;
      if (b.planoVencimento) {
        diasRestantes = Math.max(0, Math.ceil((b.planoVencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      const createdDate = b.createdAt || now;
      const mesesAcesso = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      return {
        "ID Barbearia": b.id,
        "Nome Estabelecimento": b.nome,
        "Slug": b.slug,
        "CNPJ": b.cnpj || "",
        "Telefone Estabelecimento": b.telefone || "",
        "Email Estabelecimento": b.email || "",
        "CEP": b.cep || "",
        "Logradouro": b.logradouro || "",
        "Numero": b.numero || "",
        "Bairro": b.bairro || "",
        "Cidade": b.cidade || "",
        "UF": b.uf || "",
        "Nome do Dono": dono?.nome || "",
        "Email do Dono": dono?.email || "",
        "Telefone do Dono (WhatsApp)": dono?.telefone || "",
        "Login via Google": dono?.googleId ? "Sim" : "Não",
        "Plano": b.subscriptionPlan || b.planoNome || "Trial",
        "Periodo": b.subscriptionPeriod || "",
        "Status Assinatura": b.subscriptionStatus || "trial",
        "Ativo": b.ativo ? "Sim" : "Não",
        "Vencimento Plano": b.planoVencimento ? b.planoVencimento.toISOString().split("T")[0] : "",
        "Dias Restantes": diasRestantes ?? "",
        "Qtd Profissionais": proCount,
        "Stripe Customer ID": b.stripeCustomerId || "",
        "Stripe Subscription ID": b.stripeSubscriptionId || "",
        "Data Cadastro": b.createdAt ? b.createdAt.toISOString().split("T")[0] : "",
        "Meses de Acesso": mesesAcesso,
        "Cor Primaria": b.corPrimaria || "",
        "Descricao Publica": b.descricaoPublica || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    const colWidths = Object.keys(data[0] || {}).map(key => {
      const maxLen = Math.max(key.length, ...data.map(r => String((r as any)[key] || "").length));
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logAdminAction(req.admin.id, "export_clientes", undefined, { total: allBarbearias.length, formato: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=clientes_${now.toISOString().split("T")[0]}.xlsx`);
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error("export-clientes error:", e);
    return res.status(500).json({ error: "Erro ao exportar clientes" });
  }
});

router.get("/export-clientes-estabelecimentos", requireAdmin, async (req: any, res) => {
  try {
    const allClientes = await db.select().from(clientesTable).orderBy(desc(clientesTable.createdAt));
    const allBarbearias = await db.select({ id: barbeariasTable.id, nome: barbeariasTable.nome, telefone: barbeariasTable.telefone, cidade: barbeariasTable.cidade, uf: barbeariasTable.uf }).from(barbeariasTable);
    const barbMap = new Map(allBarbearias.map(b => [b.id, b]));

    const now = new Date();

    const data = allClientes.map(c => {
      const barb = barbMap.get(c.barbeariaId);
      return {
        "ID Cliente": c.id,
        "Nome": c.nome,
        "Telefone (WhatsApp)": c.telefone || "",
        "Email": c.email || "",
        "Aniversário": c.aniversario || "",
        "VIP": c.vip ? "Sim" : "Não",
        "Pontos Fidelidade": c.pontosFidelidade,
        "Total Gasto (R$)": c.totalGasto ? parseFloat(c.totalGasto) : 0,
        "Última Visita": c.ultimaVisita || "",
        "Status": c.status || "",
        "Observações": c.observacoes || "",
        "Estabelecimento": barb?.nome || "",
        "Cidade Estabelecimento": barb?.cidade || "",
        "UF Estabelecimento": barb?.uf || "",
        "Data Cadastro": c.createdAt ? c.createdAt.toISOString().split("T")[0] : "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    if (data.length > 0) {
      const colWidths = Object.keys(data[0]).map(key => {
        const maxLen = Math.max(key.length, ...data.map(r => String((r as any)[key] || "").length));
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws["!cols"] = colWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, "Clientes Estabelecimentos");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logAdminAction(req.admin.id, "export_clientes_estabelecimentos", undefined, { total: allClientes.length, formato: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=clientes_estabelecimentos_${now.toISOString().split("T")[0]}.xlsx`);
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error("export-clientes-estabelecimentos error:", e);
    return res.status(500).json({ error: "Erro ao exportar clientes dos estabelecimentos" });
  }
});

router.get("/tenants/:id/servicos-import-template", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [barbearia] = await db.select({ id: barbeariasTable.id, nome: barbeariasTable.nome }).from(barbeariasTable).where(eq(barbeariasTable.id, id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estúdio não encontrado" });

    const exemplo = [
      { Nome: "Corte Masculino", "Preço": 50.00, "Duração (min)": 30, "Descrição": "Corte tradicional na tesoura ou máquina." },
      { Nome: "Barba Completa", "Preço": 35.00, "Duração (min)": 30, "Descrição": "Barba feita com toalha quente e produtos premium." },
      { Nome: "Corte + Barba", "Preço": 75.00, "Duração (min)": 60, "Descrição": "Combo corte + barba com desconto." },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exemplo);
    ws["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 14 }, { wch: 60 }];

    const instrucoes = [
      ["INSTRUÇÕES — Importação de Serviços"],
      [],
      ["1. Preencha a aba 'Serviços' com um serviço por linha."],
      ["2. Colunas obrigatórias: Nome e Preço."],
      ["3. Duração em minutos (se vazio, usa 30 min como padrão)."],
      ["4. Descrição é opcional."],
      ["5. Preços podem ter vírgula (50,00) ou ponto (50.00) — ambos funcionam."],
      ["6. Não deixe linhas em branco no meio dos dados."],
      ["7. Serviços com nome igual ao que já existe no estabelecimento serão pulados (não duplica)."],
      [],
      ["Estabelecimento:", barbearia.nome],
      ["ID:", String(barbearia.id)],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrucoes);
    wsInstr["!cols"] = [{ wch: 30 }, { wch: 50 }];

    XLSX.utils.book_append_sheet(wb, wsInstr, "Instruções");
    XLSX.utils.book_append_sheet(wb, ws, "Serviços");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=template_servicos_${barbearia.id}.xlsx`);
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error("servicos-import-template error:", e);
    return res.status(500).json({ error: "Erro ao gerar template" });
  }
});

const handleImportUpload = (req: any, res: any, next: any) => {
  importUpload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Arquivo muito grande. Limite máximo: 5MB." });
      }
      return res.status(400).json({ error: `Erro no upload: ${err.message || "arquivo inválido"}` });
    }
    next();
  });
};

router.post("/tenants/:id/servicos-import-preview", requireAdmin, handleImportUpload, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: "Envie um arquivo .xlsx" });

    const [barbearia] = await db.select({ id: barbeariasTable.id, nome: barbeariasTable.nome }).from(barbeariasTable).where(eq(barbeariasTable.id, id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estúdio não encontrado" });

    let parsed;
    try {
      parsed = await parseImportFile(req.file.buffer, id);
    } catch (e: any) {
      return res.status(400).json({ error: `Erro ao ler planilha: ${e?.message || "formato inválido"}` });
    }

    const novos = parsed.rows.filter(r => r.status === "novo").length;
    const duplicados = parsed.rows.filter(r => r.status === "duplicado").length;
    const erros = parsed.rows.filter(r => r.status === "erro").length;

    return res.json({
      barbearia: { id: barbearia.id, nome: barbearia.nome },
      total: parsed.rows.length,
      novos,
      duplicados,
      erros,
      rows: parsed.rows,
    });
  } catch (e) {
    console.error("servicos-import-preview error:", e);
    return res.status(500).json({ error: "Erro interno ao processar planilha" });
  }
});

router.post("/tenants/:id/servicos-import-confirm", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [barbearia] = await db.select({ id: barbeariasTable.id, nome: barbeariasTable.nome }).from(barbeariasTable).where(eq(barbeariasTable.id, id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estúdio não encontrado" });

    const incoming: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!incoming.length) return res.status(400).json({ error: "Nenhuma linha pra cadastrar" });

    const existing = await db.select({ nome: servicosTable.nome }).from(servicosTable).where(eq(servicosTable.barbeariaId, id));
    const existingNorm = new Set(existing.map(s => normalizeName(s.nome)));

    const inseridos: { nome: string; preco: number; id: number }[] = [];
    const pulados: { nome: string; motivo: string }[] = [];
    const erros: { nome: string; motivo: string }[] = [];

    const validRows: { nome: string; preco: number; duracaoMinutos: number; descricao: string | null }[] = [];

    for (const row of incoming) {
      const nome = String(row?.nome || "").trim();
      if (!nome) { erros.push({ nome: "(vazio)", motivo: "Nome obrigatório" }); continue; }
      const { value: preco, error: precoErr } = parsePrecoCell(row?.preco);
      if (precoErr || preco === null) { erros.push({ nome, motivo: precoErr || "Preço inválido" }); continue; }
      const { value: dur, error: durErr } = parseDuracaoCell(row?.duracaoMinutos);
      if (durErr) { erros.push({ nome, motivo: durErr }); continue; }
      const norm = normalizeName(nome);
      if (existingNorm.has(norm)) { pulados.push({ nome, motivo: "Já existe" }); continue; }
      existingNorm.add(norm);
      const descricao = row?.descricao == null || row?.descricao === "" ? null : String(row.descricao).trim();
      validRows.push({ nome, preco, duracaoMinutos: dur, descricao });
    }

    if (validRows.length > 0) {
      await db.transaction(async (tx) => {
        for (const r of validRows) {
          const [created] = await tx.insert(servicosTable).values({
            barbeariaId: id,
            nome: r.nome,
            preco: String(r.preco),
            duracaoMinutos: r.duracaoMinutos,
            descricao: r.descricao,
          }).returning({ id: servicosTable.id, nome: servicosTable.nome, preco: servicosTable.preco });
          inseridos.push({ id: created.id, nome: created.nome, preco: parseFloat(created.preco) });
        }
      });
    }

    await logAdminAction(req.admin.id, "servicos_import", id, {
      nome: barbearia.nome,
      inseridos: inseridos.length,
      pulados: pulados.length,
      erros: erros.length,
      nomesInseridos: inseridos.map(i => i.nome),
    });

    return res.json({
      barbearia: { id: barbearia.id, nome: barbearia.nome },
      inseridos,
      pulados,
      erros,
      totalInseridos: inseridos.length,
      totalPulados: pulados.length,
      totalErros: erros.length,
    });
  } catch (e: any) {
    console.error("servicos-import-confirm error:", e);
    return res.status(500).json({ error: `Erro ao cadastrar serviços: ${e?.message || "erro interno"}` });
  }
});

export default router;
