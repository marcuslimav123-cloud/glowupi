import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profissionaisTable, profissionalServicosTable, servicosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole, PLAN_PROFESSIONAL_LIMITS } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatProf(p: any) {
  return { ...p, comissaoValor: parseFloat(p.comissaoValor), createdAt: p.createdAt?.toISOString?.() ?? p.createdAt, updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const profs = await db.select().from(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId));

  const links = await db.select().from(profissionalServicosTable).where(eq(profissionalServicosTable.barbeariaId, barbeariaId));
  const linksByProf: Record<number, number[]> = {};
  for (const l of links) {
    if (!linksByProf[l.profissionalId]) linksByProf[l.profissionalId] = [];
    linksByProf[l.profissionalId].push(l.servicoId);
  }

  return res.json(profs.map(p => ({ ...formatProf(p), servicoIds: linksByProf[p.id] || [] })));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nomeExibicao, fotoUrl, comissaoTipo, comissaoValor, especialidade, horarios, celular, servicoIds } = req.body;
  if (!nomeExibicao || comissaoValor === undefined) return res.status(400).json({ error: "Dados inválidos" });

  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  if (barbearia) {
    const plan = barbearia.subscriptionPlan || "trial";
    const maxProfs = PLAN_PROFESSIONAL_LIMITS[plan] ?? 999;
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId));
    const currentCount = countResult?.count ?? 0;
    if (currentCount >= maxProfs) {
      return res.status(403).json({
        error: "professional_limit_reached",
        message: `Seu plano permite no máximo ${maxProfs} profissional(is). Faça upgrade para adicionar mais.`,
        currentCount,
        maxAllowed: maxProfs,
      });
    }
  }
  const [prof] = await db.insert(profissionaisTable).values({
    barbeariaId,
    nomeExibicao,
    fotoUrl: fotoUrl || null,
    comissaoTipo: comissaoTipo || "percentual",
    comissaoValor: String(comissaoValor),
    celular: celular || null,
    especialidade: especialidade || null,
    horarios: horarios || null,
  }).returning();

  let validatedIds: number[] = [];
  if (Array.isArray(servicoIds) && servicoIds.length > 0) {
    const uniqueIds = [...new Set(servicoIds.map(Number).filter(Boolean))];
    const ownedServicos = await db.select({ id: servicosTable.id }).from(servicosTable).where(and(eq(servicosTable.barbeariaId, barbeariaId), inArray(servicosTable.id, uniqueIds)));
    validatedIds = ownedServicos.map(s => s.id);
    if (validatedIds.length > 0) {
      await db.insert(profissionalServicosTable).values(
        validatedIds.map((sId: number) => ({ barbeariaId, profissionalId: prof.id, servicoId: sId }))
      );
    }
  }

  return res.status(201).json({ ...formatProf(prof), servicoIds: validatedIds });
});

router.get("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  const [prof] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!prof) return res.status(404).json({ error: "Profissional não encontrado" });

  const links = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, id), eq(profissionalServicosTable.barbeariaId, barbeariaId)));

  return res.json({ ...formatProf(prof), servicoIds: links.map(l => l.servicoId) });
});

router.put("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  const { nomeExibicao, fotoUrl, comissaoTipo, comissaoValor, ativo, ordem, especialidade, horarios, celular, servicoIds } = req.body;
  const [existing] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Profissional não encontrado" });
  const [updated] = await db.update(profissionaisTable).set({
    nomeExibicao: nomeExibicao ?? existing.nomeExibicao,
    fotoUrl: fotoUrl !== undefined ? (fotoUrl || null) : existing.fotoUrl,
    comissaoTipo: comissaoTipo ?? existing.comissaoTipo,
    comissaoValor: comissaoValor !== undefined ? String(comissaoValor) : existing.comissaoValor,
    celular: celular !== undefined ? celular : existing.celular,
    ativo: ativo !== undefined ? ativo : existing.ativo,
    ordem: ordem !== undefined ? ordem : existing.ordem,
    especialidade: especialidade ?? existing.especialidade,
    horarios: horarios ?? existing.horarios,
    updatedAt: new Date(),
  }).where(eq(profissionaisTable.id, id)).returning();

  if (Array.isArray(servicoIds)) {
    await db.delete(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, id), eq(profissionalServicosTable.barbeariaId, barbeariaId)));
    if (servicoIds.length > 0) {
      const uniqueIds = [...new Set(servicoIds.map(Number).filter(Boolean))];
      const ownedServicos = await db.select({ id: servicosTable.id }).from(servicosTable).where(and(eq(servicosTable.barbeariaId, barbeariaId), inArray(servicosTable.id, uniqueIds)));
      const validatedIds = ownedServicos.map(s => s.id);
      if (validatedIds.length > 0) {
        await db.insert(profissionalServicosTable).values(
          validatedIds.map((sId: number) => ({ barbeariaId, profissionalId: id, servicoId: sId }))
        );
      }
    }
  }

  const links = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, id), eq(profissionalServicosTable.barbeariaId, barbeariaId)));

  return res.json({ ...formatProf(updated), servicoIds: links.map(l => l.servicoId) });
});

router.delete("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  await db.delete(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, id), eq(profissionalServicosTable.barbeariaId, barbeariaId)));
  await db.delete(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Profissional removido" });
});

export default router;
