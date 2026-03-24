import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profissionaisTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatProf(p: any) {
  return { ...p, comissaoValor: parseFloat(p.comissaoValor), createdAt: p.createdAt?.toISOString?.() ?? p.createdAt, updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const profs = await db.select().from(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId));
  return res.json(profs.map(formatProf));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nomeExibicao, fotoUrl, comissaoTipo, comissaoValor, especialidade, horarios } = req.body;
  if (!nomeExibicao || comissaoValor === undefined) return res.status(400).json({ error: "Dados inválidos" });
  const [prof] = await db.insert(profissionaisTable).values({
    barbeariaId,
    nomeExibicao,
    fotoUrl: fotoUrl || null,
    comissaoTipo: comissaoTipo || "percentual",
    comissaoValor: String(comissaoValor),
    especialidade: especialidade || null,
    horarios: horarios || null,
  }).returning();
  return res.status(201).json(formatProf(prof));
});

router.get("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  const [prof] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!prof) return res.status(404).json({ error: "Profissional não encontrado" });
  return res.json(formatProf(prof));
});

router.put("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  const { nomeExibicao, fotoUrl, comissaoTipo, comissaoValor, ativo, ordem, especialidade, horarios } = req.body;
  const [existing] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Profissional não encontrado" });
  const [updated] = await db.update(profissionaisTable).set({
    nomeExibicao: nomeExibicao ?? existing.nomeExibicao,
    fotoUrl: fotoUrl ?? existing.fotoUrl,
    comissaoTipo: comissaoTipo ?? existing.comissaoTipo,
    comissaoValor: comissaoValor !== undefined ? String(comissaoValor) : existing.comissaoValor,
    ativo: ativo !== undefined ? ativo : existing.ativo,
    ordem: ordem !== undefined ? ordem : existing.ordem,
    especialidade: especialidade ?? existing.especialidade,
    horarios: horarios ?? existing.horarios,
    updatedAt: new Date(),
  }).where(eq(profissionaisTable.id, id)).returning();
  return res.json(formatProf(updated));
});

router.delete("/:profissionalId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.profissionalId);
  await db.delete(profissionaisTable).where(and(eq(profissionaisTable.id, id), eq(profissionaisTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Profissional removido" });
});

export default router;
