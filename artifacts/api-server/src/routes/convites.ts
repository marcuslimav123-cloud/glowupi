import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { convitesTable, usersTable, barbeariasTable, profissionaisTable, perfisAcessoTable, profissionaisPerfisTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, createSession, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { sendEmail, renderTemplate } from "../lib/brevo.js";
import { getTemplateForType } from "./emailTemplates.js";
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
    const now = new Date();
    return res.json(convites.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
      acceptedAt: c.acceptedAt?.toISOString() || null,
      expirado: c.status === "pendente" && c.expiresAt < now,
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

    const plan = barbearia.subscriptionPlan || (barbearia as any).planoNome || "";
    const normalizedPlan = plan.toLowerCase().replace(/\s+/g, "_");
    const isTrialOrPaid = barbearia.subscriptionStatus === "trial" || barbearia.subscriptionStatus === "ativo";
    const isTrial = barbearia.subscriptionStatus === "trial";
    if (!isTrialOrPaid) {
      return res.status(403).json({ error: "Sua assinatura está inativa. Renove seu plano para continuar.", code: "subscription_inactive" });
    }
    if (!isTrial && !PLANS_WITH_TEAM.includes(normalizedPlan)) {
      return res.status(403).json({ error: "Seu plano não permite adicionar membros à equipe. Faça upgrade para o plano '2 a 5 Profissionais' ou superior.", code: "plan_upgrade_required" });
    }

    const { email, role, nomeConvidado, perfilAcessoId, profissionalId, enviarEmail } = req.body;
    if (!email || !role) return res.status(400).json({ error: "Email e cargo são obrigatórios" });
    if (!["gerente", "colaborador"].includes(role)) return res.status(400).json({ error: "Cargo deve ser 'gerente' ou 'colaborador'" });

    if (profissionalId) {
      const pid = parseInt(profissionalId);
      const [prof] = await db.select().from(profissionaisTable).where(
        and(eq(profissionaisTable.id, pid), eq(profissionaisTable.barbeariaId, barbearia.id))
      ).limit(1);
      if (!prof) return res.status(400).json({ error: "Profissional não encontrado" });
      if (prof.usuarioId) return res.status(400).json({ error: "Este profissional já possui um usuário vinculado" });
    }

    if (role === "colaborador" && !perfilAcessoId) {
      return res.status(400).json({ error: "É obrigatório selecionar um perfil de acesso para colaboradores. Crie um perfil em Configurações → Perfis de Acesso antes de convidar.", code: "perfil_required" });
    }

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
      profissionalId: profissionalId ? parseInt(profissionalId) : null,
      token,
      status: "pendente",
      nomeConvidado: nomeConvidado || null,
      expiresAt,
    }).returning();

    let emailSent = false;
    console.log(`[Convite] Created invite for ${email}, role=${role}, enviarEmail=${enviarEmail}, perfilAcessoId=${perfilAcessoId || 'none'}`);
    if (enviarEmail) {
      try {
        const baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN || req.get("host")}`;
        const link = `${baseUrl}/convite/${token}`;
        const cargoLabel = role === "gerente" ? "Gerente" : "Colaborador(a)";
        console.log(`[Convite] Sending invite email to ${email}, link=${link}`);

        const template = await getTemplateForType("convite", barbearia.id);
        const vars: Record<string, string> = {
          nomeConvidado: nomeConvidado || "Profissional",
          nomeEstabelecimento: barbearia.nome,
          cargo: cargoLabel,
          link,
        };

        const htmlContent = template ? renderTemplate(template.corpo, vars) : `<p>Você foi convidado(a) para ${barbearia.nome}. <a href="${link}">Aceitar Convite</a></p>`;
        const subject = template ? renderTemplate(template.assunto, vars) : `Convite para ${barbearia.nome} — Glow Upi`;

        const result = await sendEmail({
          to: [{ email, name: nomeConvidado || undefined }],
          subject,
          htmlContent,
        });
        emailSent = result.success;
        console.log(`[Convite] Email result: success=${result.success}, messageId=${result.messageId || 'none'}, error=${result.error || 'none'}`);
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

router.post("/:id/resend", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários podem reenviar convites" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const conviteId = parseInt(req.params.id);
    const [convite] = await db.select().from(convitesTable).where(
      and(eq(convitesTable.id, conviteId), eq(convitesTable.barbeariaId, barbearia.id))
    ).limit(1);
    if (!convite) return res.status(404).json({ error: "Convite não encontrado" });
    if (convite.status !== "pendente") return res.status(400).json({ error: "Este convite já foi aceito" });

    const baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN || req.get("host")}`;
    const link = `${baseUrl}/convite/${convite.token}`;
    console.log(`[Convite] Resending invite email to ${convite.email}`);

    try {
      const cargoLabel = convite.role === "gerente" ? "Gerente" : "Colaborador(a)";
      const template = await getTemplateForType("convite", barbearia.id);
      const vars: Record<string, string> = {
        nomeConvidado: convite.nomeConvidado || "Profissional",
        nomeEstabelecimento: barbearia.nome,
        cargo: cargoLabel,
        link,
      };

      const htmlContent = template ? renderTemplate(template.corpo, vars) : `<p>Você foi convidado(a) para ${barbearia.nome}. <a href="${link}">Aceitar Convite</a></p>`;
      const subject = template ? renderTemplate(template.assunto, vars) + " (Lembrete)" : `Lembrete: Convite para ${barbearia.nome} — Glow Upi`;

      const result = await sendEmail({
        to: [{ email: convite.email, name: convite.nomeConvidado || undefined }],
        subject,
        htmlContent,
      });
      console.log(`[Convite] Resend result: success=${result.success}, messageId=${result.messageId || 'none'}`);
      if (!result.success) {
        return res.status(500).json({ error: `Falha ao enviar e-mail: ${result.error}` });
      }
      return res.json({ success: true, messageId: result.messageId });
    } catch (emailErr: any) {
      console.error("Resend email exception:", emailErr);
      return res.status(500).json({ error: `Erro ao enviar e-mail: ${emailErr.message}` });
    }
  } catch (e) {
    console.error("resend convite error:", e);
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
      let profId: number;

      if (convite.profissionalId) {
        const [existingProf] = await db.select().from(profissionaisTable).where(
          and(
            eq(profissionaisTable.id, convite.profissionalId),
            eq(profissionaisTable.barbeariaId, convite.barbeariaId),
            sql`${profissionaisTable.usuarioId} IS NULL`
          )
        ).limit(1);
        if (!existingProf) {
          return res.status(400).json({ error: "Profissional vinculado ao convite não está mais disponível. Peça um novo convite ao proprietário." });
        }
        profId = existingProf.id;
        await db.update(profissionaisTable).set({
          usuarioId: newUser.id,
          updatedAt: new Date(),
        }).where(and(eq(profissionaisTable.id, profId), sql`${profissionaisTable.usuarioId} IS NULL`));
      } else {
        const [prof] = await db.insert(profissionaisTable).values({
          barbeariaId: convite.barbeariaId,
          usuarioId: newUser.id,
          nomeExibicao: nome,
          ativo: true,
        }).returning();
        profId = prof.id;
      }

      await db.update(usersTable).set({ profissionalId: profId }).where(eq(usersTable.id, newUser.id));

      if (convite.perfilAcessoId) {
        await db.delete(profissionaisPerfisTable).where(eq(profissionaisPerfisTable.profissionalId, profId));
        await db.insert(profissionaisPerfisTable).values({
          profissionalId: profId,
          perfilId: convite.perfilAcessoId,
        });
      }
    }

    await db.update(convitesTable).set({
      status: "aceito",
      acceptedAt: new Date(),
    }).where(eq(convitesTable.id, convite.id));

    const sessionToken = await createSession(newUser.id);
    res.cookie("session", sessionToken, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    const { senhaHash: _, ...userWithoutPass } = newUser;
    return res.json({ token: sessionToken, user: userWithoutPass });
  } catch (e) {
    console.error("accept convite error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/equipe/profissionais-status", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "dono") return res.status(403).json({ error: "Apenas proprietários" });
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Estabelecimento não encontrado" });

    const profs = await db.select().from(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbearia.id));

    const profIds = profs.map(p => p.id);
    const perfiLinks = profIds.length > 0
      ? await db.select().from(profissionaisPerfisTable).where(sql`${profissionaisPerfisTable.profissionalId} IN (${sql.join(profIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const perfis = await db.select().from(perfisAcessoTable).where(eq(perfisAcessoTable.barbeariaId, barbearia.id));

    const pendingInvites = await db.select().from(convitesTable).where(
      and(eq(convitesTable.barbeariaId, barbearia.id), eq(convitesTable.status, "pendente"))
    );
    const invitedProfIds = new Set(pendingInvites.filter(i => i.profissionalId).map(i => i.profissionalId));

    const result = profs.map(p => {
      const perfilLink = perfiLinks.find(l => l.profissionalId === p.id);
      const perfil = perfilLink ? perfis.find(pf => pf.id === perfilLink.perfilId) : null;
      return {
        id: p.id,
        nomeExibicao: p.nomeExibicao,
        fotoUrl: p.fotoUrl,
        especialidade: p.especialidade,
        celular: p.celular,
        ativo: p.ativo,
        usuarioId: p.usuarioId,
        perfilAcesso: perfil ? { id: perfil.id, descricao: perfil.descricao, tipo: perfil.tipo } : null,
        hasPendingInvite: invitedProfIds.has(p.id),
      };
    });

    return res.json(result);
  } catch (e) {
    console.error("equipe profissionais-status error:", e);
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
