import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { convitesTable, usersTable, barbeariasTable, profissionaisTable, perfisAcessoTable, profissionaisPerfisTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, createSession } from "../lib/auth.js";
import { sendEmail, buildInviteEmailHtml } from "../lib/brevo.js";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

const PLANS_WITH_TEAM = ["2_5_pro", "6_15_pro", "15_plus_pro"];

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários podem gerenciar equipe" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });
    const convites = await db.select().from(convitesTable).where(eq(convitesTable.barbeariaId, barbearia.id));
    return res.json(convites.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
      acceptedAt: c.acceptedAt?.toISOString() || null,
    })));
  } catch (e) {
    console.error("list convites error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários podem convidar" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const plan = barbearia.subscriptionPlan || barbearia.planoNome || "";
    const normalizedPlan = plan.toLowerCase().replace(/\s+/g, "_");
    const isTrialOrPaid = barbearia.subscriptionStatus === "trial" || barbearia.subscriptionStatus === "ativo";
    if (!isTrialOrPaid || (!PLANS_WITH_TEAM.includes(normalizedPlan) && normalizedPlan !== "trial")) {
      return res.status(403).json({ error: "Seu plano não permite adicionar membros à equipe. Faça upgrade para o plano '2 a 5 Profissionais' ou superior." });
    }

    const { email, role, nomeConvidado, perfilAcessoId, enviarEmail } = req.body;
    if (!email || !role) return res.status(400).json({ error: "Email e cargo são obrigatórios" });
    if (!["gerente", "colaborador"].includes(role)) return res.status(400).json({ error: "Cargo deve ser 'gerente' ou 'colaborador'" });

    if (perfilAcessoId) {
      const pid = parseInt(perfilAcessoId);
      if (isNaN(pid)) return res.status(400).json({ error: "Perfil de acesso inválido" });
      const [perfil] = await db.select().from(perfisAcessoTable).where(
        and(eq(perfisAcessoTable.id, pid), eq(perfisAcessoTable.barbeariaId, barbearia.id))
      ).limit(1);
      if (!perfil) return res.status(400).json({ error: "Perfil de acesso não encontrado" });
    }

    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existingUser) return res.status(400).json({ error: "Este email já está cadastrado no sistema" });

    const [existingInvite] = await db.select().from(convitesTable).where(
      and(eq(convitesTable.email, email), eq(convitesTable.barbeariaId, barbearia.id), eq(convitesTable.status, "pendente"))
    ).limit(1);
    if (existingInvite) return res.status(400).json({ error: "Já existe um convite pendente para este email" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [convite] = await db.insert(convitesTable).values({
      barbeariaId: barbearia.id,
      email,
      role,
      perfilAcessoId: perfilAcessoId ? parseInt(perfilAcessoId) : null,
      token,
      status: "pendente",
      nomeConvidado: nomeConvidado || null,
      expiresAt,
    }).returning();

    let emailSent = false;
    if (enviarEmail) {
      try {
        const baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN || req.get("host")}`;
        const link = `${baseUrl}/convite/${token}`;
        const result = await sendEmail({
          to: [{ email, name: nomeConvidado || undefined }],
          subject: `Convite para ${barbearia.nome} — Glow Agenda`,
          htmlContent: buildInviteEmailHtml({
            nomeEstabelecimento: barbearia.nome,
            nomeConvidado: nomeConvidado || undefined,
            role,
            link,
          }),
        });
        emailSent = result.success;
        if (!result.success) {
          console.error("Email invite failed:", result.error);
        }
      } catch (emailErr) {
        console.error("Email send exception:", emailErr);
        emailSent = false;
      }
    }

    return res.status(201).json({
      ...convite,
      createdAt: convite.createdAt.toISOString(),
      expiresAt: convite.expiresAt.toISOString(),
      acceptedAt: null,
      emailSent: enviarEmail ? emailSent : null,
    });
  } catch (e) {
    console.error("create convite error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários podem revogar convites" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });
    const conviteId = parseInt(req.params.id);
    await db.delete(convitesTable).where(and(eq(convitesTable.id, conviteId), eq(convitesTable.barbeariaId, barbearia.id)));
    return res.json({ success: true });
  } catch (e) {
    console.error("delete convite error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [convite] = await db.select().from(convitesTable).where(eq(convitesTable.token, token)).limit(1);
    if (!convite) return res.status(404).json({ error: "Convite não encontrado" });
    if (convite.status !== "pendente") return res.status(400).json({ error: "Este convite já foi usado" });
    if (convite.expiresAt < new Date()) return res.status(400).json({ error: "Este convite expirou" });

    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, convite.barbeariaId)).limit(1);
    return res.json({
      email: convite.email,
      role: convite.role,
      nomeConvidado: convite.nomeConvidado,
      perfilAcessoId: convite.perfilAcessoId,
      estabelecimento: barbearia?.nome || "Estabelecimento",
    });
  } catch (e) {
    console.error("get convite token error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/accept/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Autenticação via Google é obrigatória" });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Login com Google não configurado" });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: "Token do Google inválido" });
    if (!payload.email_verified) return res.status(400).json({ error: "E-mail do Google não verificado" });

    const [convite] = await db.select().from(convitesTable).where(eq(convitesTable.token, token)).limit(1);
    if (!convite) return res.status(404).json({ error: "Convite não encontrado" });
    if (convite.status !== "pendente") return res.status(400).json({ error: "Este convite já foi usado" });
    if (convite.expiresAt < new Date()) return res.status(400).json({ error: "Este convite expirou" });

    if (payload.email.toLowerCase() !== convite.email.toLowerCase()) {
      return res.status(400).json({ error: `Este convite foi enviado para ${convite.email}. Faça login com a conta Google correspondente.` });
    }

    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, convite.email)).limit(1);
    if (existingUser) return res.status(400).json({ error: "Este email já está cadastrado" });

    const nome = payload.name || convite.nomeConvidado || payload.email.split("@")[0];
    const fotoUrl = payload.picture || null;

    const [newUser] = await db.insert(usersTable).values({
      nome,
      email: convite.email,
      googleId: payload.sub,
      fotoUrl,
      role: convite.role,
      barbeariaId: convite.barbeariaId,
    }).returning();

    if (convite.role === "colaborador") {
      const [prof] = await db.insert(profissionaisTable).values({
        barbeariaId: convite.barbeariaId,
        usuarioId: newUser.id,
        nomeExibicao: nome,
        ativo: true,
      }).returning();

      await db.update(usersTable).set({ profissionalId: prof.id }).where(eq(usersTable.id, newUser.id));

      if (convite.perfilAcessoId) {
        await db.insert(profissionaisPerfisTable).values({
          profissionalId: prof.id,
          perfilId: convite.perfilAcessoId,
        });
      }
    }

    await db.update(convitesTable).set({
      status: "aceito",
      acceptedAt: new Date(),
    }).where(eq(convitesTable.id, convite.id));

    const sessionToken = createSession(newUser.id);
    res.cookie("session", sessionToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
    const { senhaHash: _, ...userWithoutPass } = newUser;
    return res.json({ token: sessionToken, user: userWithoutPass });
  } catch (e) {
    console.error("accept convite error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/equipe", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários podem ver a equipe" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const membros = await db.select().from(usersTable).where(eq(usersTable.barbeariaId, barbearia.id));
    return res.json(membros.map(m => ({
      id: m.id,
      nome: m.nome,
      email: m.email,
      role: m.role,
      telefone: m.telefone,
      fotoUrl: m.fotoUrl,
      profissionalId: m.profissionalId,
      ativo: m.ativo,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (e) {
    console.error("list equipe error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/equipe/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários podem alterar a equipe" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const membroId = parseInt(req.params.id);
    const [membro] = await db.select().from(usersTable).where(
      and(eq(usersTable.id, membroId), eq(usersTable.barbeariaId, barbearia.id))
    ).limit(1);
    if (!membro) return res.status(404).json({ error: "Membro não encontrado" });

    const { role, ativo } = req.body;
    const updates: any = {};
    if (role && ["gerente", "colaborador"].includes(role)) updates.role = role;
    if (typeof ativo === "boolean") updates.ativo = ativo;

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nenhuma alteração informada" });

    if (role === "colaborador" && !membro.profissionalId) {
      const [prof] = await db.insert(profissionaisTable).values({
        barbeariaId: barbearia.id,
        nomeExibicao: membro.nome,
        ativo: true,
      }).returning();
      updates.profissionalId = prof.id;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, membroId)).returning();
    return res.json({
      id: updated.id,
      nome: updated.nome,
      email: updated.email,
      role: updated.role,
      ativo: updated.ativo,
    });
  } catch (e) {
    console.error("update equipe error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/equipe/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários podem remover membros" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const membroId = parseInt(req.params.id);
    const [membro] = await db.select().from(usersTable).where(
      and(eq(usersTable.id, membroId), eq(usersTable.barbeariaId, barbearia.id))
    ).limit(1);
    if (!membro) return res.status(404).json({ error: "Membro não encontrado" });

    await db.delete(usersTable).where(eq(usersTable.id, membroId));
    return res.json({ success: true });
  } catch (e) {
    console.error("delete equipe error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
