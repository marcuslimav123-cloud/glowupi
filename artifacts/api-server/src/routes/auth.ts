import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, barbeariasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, deleteSession, requireAuth } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  try {
    const { nome, email, senha, telefone } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }
    const senhaHash = hashPassword(senha);
    const [user] = await db.insert(usersTable).values({
      nome,
      email,
      senhaHash,
      telefone: telefone || null,
      role: "dono",
    }).returning();
    const token = createSession(user.id);
    res.cookie("session", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
    const { senhaHash: _, ...userWithoutPass } = user;
    return res.status(201).json({ token, user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() } });
  } catch (e) {
    console.error("register error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || user.senhaHash !== hashPassword(senha)) {
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

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { senhaHash: _, ...userWithoutPass } = user;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
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
    });
  } catch (e) {
    console.error("me error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
