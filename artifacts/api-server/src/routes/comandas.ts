import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { comandasTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatComanda(c: any) {
  return {
    ...c,
    valorTotal: parseFloat(c.valorTotal),
    comissaoTotal: parseFloat(c.comissaoTotal),
    dataFechamento: c.dataFechamento?.toISOString?.() ?? c.dataFechamento,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { mes, profissionalId } = req.query;
  const comandas = await db.select().from(comandasTable).where(
    and(
      eq(comandasTable.barbeariaId, barbeariaId),
      mes ? eq(comandasTable.mesAno, mes as string) : undefined,
      profissionalId ? eq(comandasTable.profissionalId, parseInt(profissionalId as string)) : undefined,
    )
  );
  return res.json(comandas.map(formatComanda));
});

export default router;
