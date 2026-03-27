import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profissionaisTable, profissionalServicosTable, servicosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole, PLAN_PROFESSIONAL_LIMITS } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

type ServicoOverrideInput = {
  servicoId: number;
  comissaoOverride?: number | null;
  tempoOverride?: number | null;
  precoOverride?: number | null;
};

function formatProf(p: typeof profissionaisTable.$inferSelect) {
  return {
    ...p,
    comissaoValor: parseFloat(p.comissaoValor),
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  };
}

function formatLink(l: typeof profissionalServicosTable.$inferSelect) {
  return {
    servicoId: l.servicoId,
    comissaoOverride: l.comissaoOverride != null ? parseFloat(l.comissaoOverride) : null,
    tempoOverride: l.tempoOverride ?? null,
    precoOverride: l.precoOverride != null ? parseFloat(l.precoOverride) : null,
  };
}

async function syncServicos(
  barbeariaId: number,
  profissionalId: number,
  servicoIds: number[],
  overrides: ServicoOverrideInput[]
) {
  await db.delete(profissionalServicosTable).where(
    and(eq(profissionalServicosTable.profissionalId, profissionalId), eq(profissionalServicosTable.barbeariaId, barbeariaId))
  );
  if (servicoIds.length === 0) return [];

  const uniqueIds = [...new Set(servicoIds.map(Number).filter(Boolean))];
  const ownedServicos = await db.select({ id: servicosTable.id }).from(servicosTable)
    .where(and(eq(servicosTable.barbeariaId, barbeariaId), inArray(servicosTable.id, uniqueIds)));
  const validatedIds = ownedServicos.map(s => s.id);
  if (validatedIds.length === 0) return [];

  const overrideMap = new Map<number, ServicoOverrideInput>();
  for (const o of overrides) {
    overrideMap.set(o.servicoId, o);
  }

  await db.insert(profissionalServicosTable).values(
    validatedIds.map((sId: number) => {
      const ov = overrideMap.get(sId);
      const comissao = ov?.comissaoOverride != null ? Math.max(0, Math.min(100, Number(ov.comissaoOverride))) : null;
      const tempo = ov?.tempoOverride != null ? Math.max(1, Math.floor(Number(ov.tempoOverride))) : null;
      const preco = ov?.precoOverride != null ? Math.max(0, Number(ov.precoOverride)) : null;
      return {
        barbeariaId,
        profissionalId,
        servicoId: sId,
        comissaoOverride: comissao != null ? String(comissao) : null,
        tempoOverride: tempo,
        precoOverride: preco != null ? String(preco) : null,
      };
    })
  );
  return validatedIds;
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const profs = await db.select().from(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId));

  const links = await db.select().from(profissionalServicosTable).where(eq(profissionalServicosTable.barbeariaId, barbeariaId));
  const linksByProf: Record<number, typeof links> = {};
  for (const l of links) {
    if (!linksByProf[l.profissionalId]) linksByProf[l.profissionalId] = [];
    linksByProf[l.profissionalId].push(l);
  }

  return res.json(profs.map(p => ({
    ...formatProf(p),
    servicoIds: (linksByProf[p.id] || []).map(l => l.servicoId),
    servicosOverrides: (linksByProf[p.id] || []).map(formatLink),
  })));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const {
    nomeExibicao, apelido, fotoUrl, comissaoTipo, comissaoValor,
    especialidade, horarios, celular, servicoIds, servicosOverrides
  } = req.body;
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
    apelido: apelido ?? null,
    fotoUrl: fotoUrl ?? null,
    comissaoTipo: comissaoTipo ?? "percentual",
    comissaoValor: String(comissaoValor),
    celular: celular ?? null,
    especialidade: especialidade ?? null,
    horarios: horarios ?? null,
  }).returning();

  let validatedIds: number[] = [];
  const overrides: ServicoOverrideInput[] = Array.isArray(servicosOverrides) ? servicosOverrides : [];
  if (Array.isArray(servicoIds) && servicoIds.length > 0) {
    validatedIds = await syncServicos(barbeariaId, prof.id, servicoIds, overrides);
  }

  const links = await db.select().from(profissionalServicosTable).where(
    and(eq(profissionalServicosTable.profissionalId, prof.id), eq(profissionalServicosTable.barbeariaId, barbeariaId))
  );

  return res.status(201).json({
    ...formatProf(prof),
    servicoIds: validatedIds,
    servicosOverrides: links.map(formatLink),
  });
});

router.put("/bulk-horarios", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { profissionalIds, resetToDefault } = req.body;
  if (!resetToDefault) return res.status(400).json({ error: "Operação inválida" });

  let whereClause;
  if (Array.isArray(profissionalIds) && profissionalIds.length > 0) {
    whereClause = and(eq(profissionaisTable.barbeariaId, barbeariaId), inArray(profissionaisTable.id, profissionalIds.map(Number)));
  } else {
    whereClause = eq(profissionaisTable.barbeariaId, barbeariaId);
  }

  await db.update(profissionaisTable).set({ horarios: null, updatedAt: new Date() }).where(whereClause);
  return res.json({ success: true });
});

router.get("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  const [prof] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!prof) return res.status(404).json({ error: "Profissional não encontrado" });

  const links = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, id), eq(profissionalServicosTable.barbeariaId, barbeariaId)));

  return res.json({
    ...formatProf(prof),
    servicoIds: links.map(l => l.servicoId),
    servicosOverrides: links.map(formatLink),
  });
});

router.put("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  const {
    nomeExibicao, apelido, fotoUrl, comissaoTipo, comissaoValor,
    ativo, ordem, especialidade, horarios, celular, servicoIds, servicosOverrides
  } = req.body;
  const [existing] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Profissional não encontrado" });
  const [updated] = await db.update(profissionaisTable).set({
    nomeExibicao: nomeExibicao ?? existing.nomeExibicao,
    apelido: apelido !== undefined ? (apelido || null) : existing.apelido,
    fotoUrl: fotoUrl !== undefined ? (fotoUrl || null) : existing.fotoUrl,
    comissaoTipo: comissaoTipo ?? existing.comissaoTipo,
    comissaoValor: comissaoValor != null ? String(comissaoValor) : existing.comissaoValor,
    celular: celular !== undefined ? celular : existing.celular,
    ativo: ativo !== undefined ? ativo : existing.ativo,
    ordem: ordem !== undefined ? ordem : existing.ordem,
    especialidade: especialidade ?? existing.especialidade,
    horarios: horarios ?? existing.horarios,
    updatedAt: new Date(),
  }).where(eq(profissionaisTable.id, id)).returning();

  if (Array.isArray(servicoIds)) {
    const overrides: ServicoOverrideInput[] = Array.isArray(servicosOverrides) ? servicosOverrides : [];
    await syncServicos(barbeariaId, id, servicoIds, overrides);
  }

  const links = await db.select().from(profissionalServicosTable).where(and(eq(profissionalServicosTable.profissionalId, id), eq(profissionalServicosTable.barbeariaId, barbeariaId)));

  return res.json({
    ...formatProf(updated),
    servicoIds: links.map(l => l.servicoId),
    servicosOverrides: links.map(formatLink),
  });
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
