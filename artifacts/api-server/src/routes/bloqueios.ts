import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bloqueiosHorarioTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

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

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  if (user.role === "colaborador") {
    const params = await getParametros(barbeariaId);
    if (params["agenda_nao_bloquear_profissional"] === "Sim") {
      return res.status(403).json({ error: "Bloqueio de horário não permitido para profissionais não-gestores" });
    }
    if (!user.profissionalId) {
      return res.status(403).json({ error: "Profissional não vinculado" });
    }
  }
  const { profissionalId: reqProfId, data, horaInicio, horaFim, motivo } = req.body;
  // Profissional (não gestor) só bloqueia a própria agenda, mesmo que o pedido traga outro id.
  const profissionalId = user.role === "colaborador" ? user.profissionalId : reqProfId;
  if (!profissionalId || !data || !horaInicio || !horaFim) {
    return res.status(400).json({ error: "Dados inválidos: profissionalId, data, horaInicio e horaFim são obrigatórios" });
  }
  if (String(horaFim) <= String(horaInicio)) {
    return res.status(400).json({ error: "O horário final precisa ser depois do inicial" });
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

router.delete("/:bloqueioId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.bloqueioId);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  const [bloqueio] = await db.select().from(bloqueiosHorarioTable).where(
    and(eq(bloqueiosHorarioTable.id, id), eq(bloqueiosHorarioTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!bloqueio) return res.status(404).json({ error: "Bloqueio não encontrado" });
  // Profissional (não gestor) só remove bloqueios da própria agenda.
  if (user.role === "colaborador" && bloqueio.profissionalId !== user.profissionalId) {
    return res.status(403).json({ error: "Você só pode remover bloqueios da sua própria agenda" });
  }
  await db.delete(bloqueiosHorarioTable).where(eq(bloqueiosHorarioTable.id, id));
  return res.json({ success: true, message: "Bloqueio removido" });
});

export default router;
