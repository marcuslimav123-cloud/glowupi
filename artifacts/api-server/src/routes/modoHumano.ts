import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, checkBarbeariaAccessDono } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const [b] = await db.select({ modoHumano: barbeariasTable.modoHumano }).from(barbeariasTable)
      .where(eq(barbeariasTable.id, barbeariaId)).limit(1);
    return res.json({ modoHumano: !!b?.modoHumano });
  } catch (e) {
    console.error("getModoHumano error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkBarbeariaAccessDono(req, res);
    if (!barbeariaId) return;
    const { modoHumano } = req.body || {};
    if (typeof modoHumano !== "boolean") {
      return res.status(400).json({ error: "Campo modoHumano (boolean) obrigatório" });
    }
    await db.update(barbeariasTable).set({ modoHumano }).where(eq(barbeariasTable.id, barbeariaId));
    return res.json({ modoHumano });
  } catch (e) {
    console.error("putModoHumano error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
