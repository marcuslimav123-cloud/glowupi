import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clienteUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createClientSession, deleteClientSession, requireClient } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    }

    const [existing] = await db.select().from(clienteUsersTable).where(eq(clienteUsersTable.email, email.toLowerCase().trim())).limit(1);
    if (existing) {
      return res.status(409).json({ error: "Este email já está cadastrado" });
    }

    const [clienteUser] = await db.insert(clienteUsersTable).values({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senhaHash: hashPassword(senha),
      telefone: telefone?.trim() || null,
    }).returning();

    const token = createClientSession(clienteUser.id);
    res.cookie("client_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(201).json({
      id: clienteUser.id,
      nome: clienteUser.nome,
      email: clienteUser.email,
      telefone: clienteUser.telefone,
      fotoUrl: clienteUser.fotoUrl,
    });
  } catch (e) {
    console.error("client register error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const [clienteUser] = await db.select().from(clienteUsersTable).where(eq(clienteUsersTable.email, email.toLowerCase().trim())).limit(1);
    if (!clienteUser || !clienteUser.senhaHash) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    if (clienteUser.senhaHash !== hashPassword(senha)) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const token = createClientSession(clienteUser.id);
    res.cookie("client_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      id: clienteUser.id,
      nome: clienteUser.nome,
      email: clienteUser.email,
      telefone: clienteUser.telefone,
      fotoUrl: clienteUser.fotoUrl,
    });
  } catch (e) {
    console.error("client login error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Credential é obrigatório" });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Login com Google não configurado" });

    const oauth2Client = new OAuth2Client(clientId);
    const ticket = await oauth2Client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ error: "Token inválido" });
    if (!payload.email_verified) return res.status(400).json({ error: "E-mail do Google não verificado" });

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: "Email não encontrado no token" });

    let [clienteUser] = await db.select().from(clienteUsersTable).where(eq(clienteUsersTable.googleId, googleId)).limit(1);
    if (!clienteUser) {
      [clienteUser] = await db.select().from(clienteUsersTable).where(eq(clienteUsersTable.email, email.toLowerCase())).limit(1);
      if (clienteUser) {
        [clienteUser] = await db.update(clienteUsersTable).set({
          googleId,
          fotoUrl: picture || clienteUser.fotoUrl,
          updatedAt: new Date(),
        }).where(eq(clienteUsersTable.id, clienteUser.id)).returning();
      } else {
        [clienteUser] = await db.insert(clienteUsersTable).values({
          nome: name || "Cliente",
          email: email.toLowerCase(),
          googleId,
          fotoUrl: picture || null,
        }).returning();
      }
    }

    const token = createClientSession(clienteUser.id);
    res.cookie("client_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({
      id: clienteUser.id,
      nome: clienteUser.nome,
      email: clienteUser.email,
      telefone: clienteUser.telefone,
      fotoUrl: clienteUser.fotoUrl,
    });
  } catch (e) {
    console.error("client google login error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/me", requireClient, async (req, res) => {
  const clienteUser = (req as any).clienteUser;
  return res.json({
    id: clienteUser.id,
    nome: clienteUser.nome,
    email: clienteUser.email,
    telefone: clienteUser.telefone,
    fotoUrl: clienteUser.fotoUrl,
  });
});

router.post("/logout", (req, res) => {
  const token = req.cookies?.["client_session"];
  if (token) {
    deleteClientSession(token);
  }
  res.clearCookie("client_session", { path: "/" });
  return res.json({ success: true });
});

export default router;
