import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

router.post("/register", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: "Token é obrigatório" });

  const existing = await db.select().from(pushTokensTable).where(
    and(
      eq(pushTokensTable.userId, user.id),
      eq(pushTokensTable.token, token)
    )
  ).limit(1);

  if (existing.length > 0) {
    await db.update(pushTokensTable).set({
      ativo: true,
      barbeariaId,
      platform: platform || existing[0].platform,
      updatedAt: new Date(),
    }).where(eq(pushTokensTable.id, existing[0].id));
    return res.json({ success: true, message: "Token atualizado" });
  }

  await db.insert(pushTokensTable).values({
    userId: user.id,
    barbeariaId,
    token,
    platform: platform || "web",
    ativo: true,
  });
  return res.status(201).json({ success: true, message: "Token registrado" });
});

router.post("/unregister", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token é obrigatório" });

  await db.update(pushTokensTable).set({ ativo: false, updatedAt: new Date() }).where(
    and(
      eq(pushTokensTable.userId, user.id),
      eq(pushTokensTable.token, token)
    )
  );
  return res.json({ success: true, message: "Token desregistrado" });
});

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;

  const tokens = await db.select().from(pushTokensTable).where(
    and(
      eq(pushTokensTable.userId, user.id),
      eq(pushTokensTable.barbeariaId, barbeariaId),
      eq(pushTokensTable.ativo, true)
    )
  );
  return res.json(tokens);
});

export default router;
