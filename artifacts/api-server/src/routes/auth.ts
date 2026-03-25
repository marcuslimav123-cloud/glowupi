import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, barbeariasTable, superAdminsTable, profissionaisTable, profissionaisPerfisTable, perfisAcessoTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, createSession, deleteSession, requireAuth } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

router.post("/register", async (_req, res) => {
  return res.status(403).json({ error: "O cadastro é feito exclusivamente via Google. Use o botão 'Cadastrar com Google'." });
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      const [adminUser] = await db.select().from(superAdminsTable).where(eq(superAdminsTable.email, email)).limit(1);
      if (adminUser) {
        return res.status(403).json({ error: "Este é um login de administrador. Acesse /admin/login para entrar no painel administrativo.", isAdmin: true });
      }
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }
    if (user.senhaHash !== hashPassword(senha)) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }
    const token = createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({ token, user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() } });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/logout", (req, res) => {
  const token = req.cookies?.["session"] || req.headers.authorization?.replace("Bearer ", "");
  if (token) deleteSession(token);
  res.clearCookie("session");
  return res.json({ success: true, message: "Logout realizado" });
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Token do Google obrigatório" });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Login com Google não configurado" });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: "Token inválido" });
    if (!payload.email_verified) return res.status(400).json({ error: "E-mail do Google não verificado" });

    const googleId = payload.sub;
    const email = payload.email;
    const nome = payload.name || email.split("@")[0];
    const fotoUrl = payload.picture || null;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    let isNew = false;

    if (user) {
      if (!user.googleId) {
        [user] = await db.update(usersTable).set({ googleId, fotoUrl: fotoUrl || user.fotoUrl }).where(eq(usersTable.id, user.id)).returning();
      }
    } else {
      isNew = true;
      [user] = await db.insert(usersTable).values({
        nome,
        email,
        googleId,
        fotoUrl,
        role: "dono",
      }).returning();
    }

    const token = createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({ token, user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() }, isNew });
  } catch (e: any) {
    console.error("Google auth error:", e);
    return res.status(401).json({ error: "Falha na autenticação com Google" });
  }
});

router.post("/complete-profile", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ error: "WhatsApp é obrigatório" });
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) return res.status(400).json({ error: "WhatsApp inválido. Use DDD + número." });
    const [updated] = await db.update(usersTable).set({ telefone }).where(eq(usersTable.id, user.id)).returning();
    const { senhaHash: _, ...userWithoutPass } = updated;
    return res.json({ ...userWithoutPass, createdAt: updated.createdAt.toISOString() });
  } catch (e) {
    console.error("complete-profile error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/tema", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { tema } = req.body;
    const validTemas = ["blue", "black", "purple", "green", "red", "yellow", "teal", "bluegray", "brown", "light-blue", "light-purple", "light-green", "light-red", "light-yellow", "light-teal", "light-bluegray", "light-brown"];
    if (!tema || !validTemas.includes(tema)) {
      return res.status(400).json({ error: "Tema inválido" });
    }
    const [updated] = await db.update(usersTable).set({ tema, updatedAt: new Date() }).where(eq(usersTable.id, user.id)).returning();
    return res.json({ tema: updated.tema });
  } catch (e) {
    console.error("tema update error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { senhaHash: _, ...userWithoutPass } = user;
    let barbearia = null;
    if (user.role === "dono") {
      const [b] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
      barbearia = b || null;
    } else if (user.barbeariaId) {
      const [b] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, user.barbeariaId)).limit(1);
      barbearia = b || null;
    }
    let perfilPermissoes: string[] | null = null;
    if (barbearia && (user.role === "gerente" || user.role === "colaborador") && user.profissionalId) {
      const [vinculo] = await db.select().from(profissionaisPerfisTable)
        .where(eq(profissionaisPerfisTable.profissionalId, user.profissionalId)).limit(1);
      if (vinculo) {
        const [perfil] = await db.select().from(perfisAcessoTable)
          .where(and(
            eq(perfisAcessoTable.id, vinculo.perfilId),
            eq(perfisAcessoTable.ativo, true),
            eq(perfisAcessoTable.barbeariaId, barbearia.id)
          )).limit(1);
        if (perfil && Array.isArray(perfil.permissoes)) {
          perfilPermissoes = perfil.permissoes as string[];
        }
      }
    }

    return res.json({
      ...userWithoutPass,
      createdAt: user.createdAt.toISOString(),
      barbearia: barbearia ? {
        ...barbearia,
        createdAt: barbearia.createdAt.toISOString(),
        updatedAt: barbearia.updatedAt.toISOString(),
        planoVencimento: barbearia.planoVencimento?.toISOString() ?? null,
      } : null,
      barbeariaId: barbearia?.id ?? null,
      onboardingCompleto: barbearia ? barbearia.onboardingStep >= 3 : false,
      perfilPermissoes,
    });
  } catch (e) {
    console.error("me error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
