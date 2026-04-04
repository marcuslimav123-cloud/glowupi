import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificacoesTable, notificacoesLidasTable } from "@workspace/db/schema";
import { eq, and, desc, sql, notInArray } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const limit = parseInt(req.query.limit as string) || 30;

  const notificacoes = await db.select().from(notificacoesTable).where(
    eq(notificacoesTable.barbeariaId, barbeariaId)
  ).orderBy(desc(notificacoesTable.createdAt)).limit(limit);

  const notifIds = notificacoes.map(n => n.id);
  let lidasSet = new Set<number>();
  if (notifIds.length > 0) {
    const lidas = await db.select({ notificacaoId: notificacoesLidasTable.notificacaoId })
      .from(notificacoesLidasTable)
      .where(
        and(
          eq(notificacoesLidasTable.userId, user.id),
          sql`${notificacoesLidasTable.notificacaoId} IN (${sql.join(notifIds.map(id => sql`${id}`), sql`, `)})`
        )
      );
    lidasSet = new Set(lidas.map(l => l.notificacaoId));
  }

  return res.json(notificacoes.map(n => ({
    ...n,
    lida: lidasSet.has(n.id),
  })));
});

router.get("/nao-lidas", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;

  const [result] = await db.select({
    count: sql<number>`
      (SELECT count(*)::int FROM notificacoes n
       WHERE n.barbearia_id = ${barbeariaId}
       AND NOT EXISTS (
         SELECT 1 FROM notificacoes_lidas nl
         WHERE nl.notificacao_id = n.id AND nl.user_id = ${user.id}
       ))
    `
  }).from(sql`(SELECT 1) as dummy`);

  return res.json({ count: result?.count || 0 });
});

router.post("/:id/lida", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  const [notif] = await db.select().from(notificacoesTable).where(
    and(eq(notificacoesTable.id, id), eq(notificacoesTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!notif) return res.status(404).json({ error: "Notificação não encontrada" });

  const [existing] = await db.select().from(notificacoesLidasTable).where(
    and(
      eq(notificacoesLidasTable.notificacaoId, id),
      eq(notificacoesLidasTable.userId, user.id)
    )
  ).limit(1);

  if (!existing) {
    await db.insert(notificacoesLidasTable).values({
      notificacaoId: id,
      userId: user.id,
    });
  }

  return res.json({ success: true });
});

router.post("/ler-todas", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;

  const unreadNotifs = await db.select({ id: notificacoesTable.id }).from(notificacoesTable).where(
    eq(notificacoesTable.barbeariaId, barbeariaId)
  );

  if (unreadNotifs.length > 0) {
    const existingLidas = await db.select({ notificacaoId: notificacoesLidasTable.notificacaoId })
      .from(notificacoesLidasTable)
      .where(eq(notificacoesLidasTable.userId, user.id));
    const lidasSet = new Set(existingLidas.map(l => l.notificacaoId));

    const toInsert = unreadNotifs
      .filter(n => !lidasSet.has(n.id))
      .map(n => ({ notificacaoId: n.id, userId: user.id }));

    if (toInsert.length > 0) {
      await db.insert(notificacoesLidasTable).values(toInsert);
    }
  }

  return res.json({ success: true });
});

export default router;
