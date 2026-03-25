import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bloqueiosHorarioTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { data, profissionalId } = req.query;
  const bloqueios = await db.select().from(bloqueiosHorarioTable).where(
    and(
      eq(bloqueiosHorarioTable.barbeariaId, barbeariaId),
      data ? eq(bloqueiosHorarioTable.data, data as string) : undefined,
      profissionalId ? eq(bloqueiosHorarioTable.profissionalId, parseInt(profissionalId as string)) : undefined,
    )
  );
  return res.json(bloqueios.map(b => ({
    ...b,
    createdAt: b.createdAt?.toISOString?.() ?? b.createdAt,
  })));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { profissionalId, data, horaInicio, horaFim, motivo } = req.body;
  if (!profissionalId || !data || !horaInicio || !horaFim) {
    return res.status(400).json({ error: "Dados inválidos: profissionalId, data, horaInicio e horaFim são obrigatórios" });
  }
  const [bloqueio] = await db.insert(bloqueiosHorarioTable).values({
    barbeariaId,
    profissionalId,
    data,
    horaInicio,
    horaFim,
    motivo: motivo || null,
  }).returning();
  return res.status(201).json({
    ...bloqueio,
    createdAt: bloqueio.createdAt?.toISOString?.() ?? bloqueio.createdAt,
  });
});

router.delete("/:bloqueioId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.bloqueioId);
  await db.delete(bloqueiosHorarioTable).where(
    and(eq(bloqueiosHorarioTable.id, id), eq(bloqueiosHorarioTable.barbeariaId, barbeariaId))
  );
  return res.json({ success: true, message: "Bloqueio removido" });
});

export default router;
