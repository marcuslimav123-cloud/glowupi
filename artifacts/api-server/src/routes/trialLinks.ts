import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { trialLinksTable, usersTable } from "@workspace/db/schema";
import { eq, and, sql, gt } from "drizzle-orm";
import { hashPassword, createSession } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [link] = await db.select().from(trialLinksTable).where(eq(trialLinksTable.token, token)).limit(1);
    if (!link) return res.status(404).json({ error: "Link não encontrado" });
    if (link.used) return res.status(410).json({ error: "Este link já foi utilizado", code: "already_used" });
    if (new Date() > link.expiresAt) return res.status(410).json({ error: "Este link expirou", code: "expired" });
    return res.json({ valid: true, trialDays: link.trialDays });
  } catch (e) {
    console.error("trial link check error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:token/register", async (req, res) => {
  try {
    const { token } = req.params;
    const { nome, email: rawEmail, senha, utm } = req.body;
    if (!nome || !rawEmail || !senha) return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    if (senha.length < 6) return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Email inválido" });

    const claimed = await db.update(trialLinksTable).set({
      used: true,
      usedAt: new Date(),
      usedByEmail: email,
    }).where(
      and(
        eq(trialLinksTable.token, token),
        eq(trialLinksTable.used, false),
        gt(trialLinksTable.expiresAt, new Date())
      )
    ).returning();

    if (claimed.length === 0) {
      const [link] = await db.select().from(trialLinksTable).where(eq(trialLinksTable.token, token)).limit(1);
      if (!link) return res.status(404).json({ error: "Link não encontrado" });
      if (link.used) return res.status(410).json({ error: "Este link já foi utilizado", code: "already_used" });
      return res.status(410).json({ error: "Este link expirou", code: "expired" });
    }

    const claimedLink = claimed[0];

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      await db.update(trialLinksTable).set({
        used: false,
        usedAt: null,
        usedByEmail: null,
      }).where(eq(trialLinksTable.id, claimedLink.id));
      return res.status(409).json({ error: "Este email já está cadastrado" });
    }

    const [user] = await db.insert(usersTable).values({
      nome: nome.trim(),
      email,
      senhaHash: hashPassword(senha),
      role: "dono",
      utmSource: utm?.utmSource || null,
      utmMedium: utm?.utmMedium || null,
      utmCampaign: utm?.utmCampaign || null,
      utmContent: utm?.utmContent || null,
      utmTerm: utm?.utmTerm || null,
      fbclid: utm?.fbclid || null,
      gclid: utm?.gclid || null,
      landingPage: utm?.landingPage || null,
      referrer: utm?.referrer || null,
    }).returning();

    await db.update(trialLinksTable).set({
      usedByUserId: user.id,
    }).where(eq(trialLinksTable.id, claimedLink.id));

    const sessionToken = await createSession(user.id);
    res.cookie("session", sessionToken, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });

    const { senhaHash: _, ...userWithoutPass } = user;
    return res.json({
      token: sessionToken,
      user: { ...userWithoutPass, createdAt: user.createdAt.toISOString() },
      trialDays: claimedLink.trialDays,
      trialLinkId: claimedLink.id,
    });
  } catch (e) {
    console.error("trial register error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
