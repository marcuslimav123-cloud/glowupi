import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientePushTokensTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireClient } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/register", requireClient, async (req, res) => {
  const clienteUser = (req as any).clienteUser;
  const { token, platform, barbeariaId } = req.body;
  if (!token) return res.status(400).json({ error: "Token é obrigatório" });

  const existing = await db.select().from(clientePushTokensTable).where(
    and(
      eq(clientePushTokensTable.clienteUserId, clienteUser.id),
      eq(clientePushTokensTable.token, token)
    )
  ).limit(1);

  if (existing.length > 0) {
    await db.update(clientePushTokensTable).set({
      ativo: true,
      barbeariaId: barbeariaId || existing[0].barbeariaId,
      platform: platform || existing[0].platform,
      updatedAt: new Date(),
    }).where(eq(clientePushTokensTable.id, existing[0].id));
    return res.json({ success: true, message: "Token atualizado" });
  }

  await db.insert(clientePushTokensTable).values({
    clienteUserId: clienteUser.id,
    barbeariaId: barbeariaId || null,
    token,
    platform: platform || "web",
    ativo: true,
  });
  return res.status(201).json({ success: true, message: "Token registrado" });
});

router.post("/unregister", requireClient, async (req, res) => {
  const clienteUser = (req as any).clienteUser;
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token é obrigatório" });

  await db.update(clientePushTokensTable).set({ ativo: false, updatedAt: new Date() }).where(
    and(
      eq(clientePushTokensTable.clienteUserId, clienteUser.id),
      eq(clientePushTokensTable.token, token)
    )
  );
  return res.json({ success: true, message: "Token desregistrado" });
});

export default router;
