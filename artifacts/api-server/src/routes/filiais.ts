import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { filiaisTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

const PLANS_WITH_FILIAIS = ["6_15_pro", "15_plus_pro"];

async function checkFilialPlan(barbeariaId: number): Promise<boolean> {
  const [barbearia] = await db.select({
    subscriptionPlan: barbeariasTable.subscriptionPlan,
    planoNome: barbeariasTable.planoNome,
  }).from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  if (!barbearia) return false;
  const plan = barbearia.subscriptionPlan || barbearia.planoNome || "";
  return PLANS_WITH_FILIAIS.includes(plan);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const eligible = await checkFilialPlan(barbeariaId);
    if (!eligible) {
      return res.json({ eligible: false, filiais: [] });
    }

    const filiais = await db.select().from(filiaisTable).where(eq(filiaisTable.barbeariaId, barbeariaId));
    return res.json({
      eligible: true,
      filiais: filiais.map(f => ({
        ...f,
        createdAt: f.createdAt?.toISOString(),
        updatedAt: f.updatedAt?.toISOString(),
      })),
    });
  } catch (e) {
    console.error("filiais list error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const eligible = await checkFilialPlan(barbeariaId);
    if (!eligible) {
      return res.status(403).json({ error: "Seu plano não suporta filiais. Faça upgrade para o plano 6 a 15 Profissionais ou superior." });
    }

    const { nome, cep, logradouro, numero, bairro, cidade, uf, telefone, horarioFuncionamento } = req.body;
    if (!nome) {
      return res.status(400).json({ error: "Nome da filial é obrigatório" });
    }

    const [filial] = await db.insert(filiaisTable).values({
      barbeariaId,
      nome,
      cep: cep || null,
      logradouro: logradouro || null,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf || null,
      telefone: telefone || null,
      horarioFuncionamento: horarioFuncionamento || null,
    }).returning();

    return res.status(201).json({
      ...filial,
      createdAt: filial.createdAt?.toISOString(),
      updatedAt: filial.updatedAt?.toISOString(),
    });
  } catch (e) {
    console.error("filial create error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:filialId", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const filialId = parseInt(req.params.filialId);
    if (isNaN(filialId)) return res.status(400).json({ error: "ID inválido" });

    const [existing] = await db.select().from(filiaisTable).where(
      and(eq(filiaisTable.id, filialId), eq(filiaisTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!existing) return res.status(404).json({ error: "Filial não encontrada" });

    const { nome, cep, logradouro, numero, bairro, cidade, uf, telefone, horarioFuncionamento, ativo } = req.body;

    const [updated] = await db.update(filiaisTable).set({
      nome: nome ?? existing.nome,
      cep: cep !== undefined ? (cep || null) : existing.cep,
      logradouro: logradouro !== undefined ? (logradouro || null) : existing.logradouro,
      numero: numero !== undefined ? (numero || null) : existing.numero,
      bairro: bairro !== undefined ? (bairro || null) : existing.bairro,
      cidade: cidade !== undefined ? (cidade || null) : existing.cidade,
      uf: uf !== undefined ? (uf || null) : existing.uf,
      telefone: telefone !== undefined ? (telefone || null) : existing.telefone,
      horarioFuncionamento: horarioFuncionamento !== undefined ? horarioFuncionamento : existing.horarioFuncionamento,
      ativo: ativo !== undefined ? ativo : existing.ativo,
      updatedAt: new Date(),
    }).where(eq(filiaisTable.id, filialId)).returning();

    return res.json({
      ...updated,
      createdAt: updated.createdAt?.toISOString(),
      updatedAt: updated.updatedAt?.toISOString(),
    });
  } catch (e) {
    console.error("filial update error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:filialId", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const filialId = parseInt(req.params.filialId);
    if (isNaN(filialId)) return res.status(400).json({ error: "ID inválido" });

    const [existing] = await db.select().from(filiaisTable).where(
      and(eq(filiaisTable.id, filialId), eq(filiaisTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!existing) return res.status(404).json({ error: "Filial não encontrada" });

    await db.update(filiaisTable).set({ ativo: false, updatedAt: new Date() }).where(eq(filiaisTable.id, filialId));
    return res.json({ success: true });
  } catch (e) {
    console.error("filial delete error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
