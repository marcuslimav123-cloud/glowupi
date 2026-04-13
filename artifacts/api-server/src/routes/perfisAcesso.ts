import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { perfisAcessoTable, profissionaisPerfisTable, profissionaisTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const PLAN_PERFIL_LIMITS: Record<string, number> = {
  "1_pro": 0,
  "2_5_pro": 5,
  "6_15_pro": 15,
  "15_plus_pro": 999,
  "single": 999,
  "trial": 999,
};

const router: IRouter = Router({ mergeParams: true });

const VALID_TIPOS = ["web", "app"];
const VALID_PERMISSIONS = [
  "dashboard", "agenda", "agenda_picos", "comandas",
  "clientes", "profissionais", "servicos", "produtos",
  "tipos", "cupons", "mensagens", "lembretes", "avaliacoes",
  "clube", "clubes_assinatura",
  "pacotes", "venda_pacotes",
  "relatorios",
  "caixa", "financeiro", "comissoes",
  "lista_espera", "configuracoes", "empresa", "equipe",
  "dados_usuario", "senha_acesso",
  "app_dashboard", "app_agenda", "app_comandas",
  "app_clientes", "app_servicos", "app_produtos",
  "app_caixa", "app_comissoes",
  "app_rede_social", "app_divulgacao",
  "app_ajuda", "app_videos_tutoriais", "app_documentos", "app_tap_to_pay",
];

function validatePermissoes(perms: unknown): string[] | null {
  if (!Array.isArray(perms)) return null;
  const valid = perms.filter((p): p is string => typeof p === "string" && VALID_PERMISSIONS.includes(p));
  return valid;
}

async function validateProfissionalIds(ids: number[], barbeariaId: number): Promise<number[]> {
  if (ids.length === 0) return [];
  const profs = await db.select({ id: profissionaisTable.id })
    .from(profissionaisTable)
    .where(and(eq(profissionaisTable.barbeariaId, barbeariaId), inArray(profissionaisTable.id, ids)));
  return profs.map(p => p.id);
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const { tipo } = req.query;
    const conditions = [eq(perfisAcessoTable.barbeariaId, barbeariaId)];
    if (tipo && VALID_TIPOS.includes(tipo as string)) {
      conditions.push(eq(perfisAcessoTable.tipo, tipo as string));
    }
    const perfis = await db.select().from(perfisAcessoTable).where(and(...conditions)).orderBy(perfisAcessoTable.descricao);

    const perfilIds = perfis.map(p => p.id);
    const vinculos = perfilIds.length > 0
      ? await db.select().from(profissionaisPerfisTable).where(inArray(profissionaisPerfisTable.perfilId, perfilIds))
      : [];
    const profs = await db.select().from(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId));

    const result = perfis.map(p => {
      const profIds = vinculos.filter(v => v.perfilId === p.id).map(v => v.profissionalId);
      const profissionaisDoPerf = profs.filter(pr => profIds.includes(pr.id));
      return {
        ...p,
        permissoes: Array.isArray(p.permissoes) ? p.permissoes : [],
        profissionais: profissionaisDoPerf.map(pr => ({ id: pr.id, nome: pr.nomeExibicao })),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
    return res.json(result);
  } catch (e) {
    console.error("perfis-acesso list error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
    if (barbearia) {
      const rawPlan = (barbearia.subscriptionPlan || (barbearia as any).planoNome || "").toLowerCase().replace(/\s+/g, "_");
      const isTrial = barbearia.subscriptionStatus === "trial";
      const limit = isTrial ? 999 : (PLAN_PERFIL_LIMITS[rawPlan] ?? (rawPlan ? 0 : 999));
      if (limit === 0) {
        return res.status(403).json({
          error: "Seu plano atual não permite criar perfis de acesso. Faça upgrade para o plano '2 a 5 Profissionais' ou superior.",
          code: "perfil_limit_reached",
        });
      }
      const [{ total }] = await db.select({ total: count() }).from(perfisAcessoTable).where(eq(perfisAcessoTable.barbeariaId, barbeariaId));
      if (Number(total) >= limit) {
        return res.status(403).json({
          error: `Você atingiu o limite de ${limit} perfis de acesso do seu plano. Faça upgrade para adicionar mais.`,
          code: "perfil_limit_reached",
        });
      }
    }

    const { descricao, tipo, permissoes, profissionalIds } = req.body;
    if (!descricao || typeof descricao !== "string" || descricao.trim().length === 0) {
      return res.status(400).json({ error: "Descrição é obrigatória" });
    }
    const validTipo = VALID_TIPOS.includes(tipo) ? tipo : "web";
    const validPerms = validatePermissoes(permissoes);
    if (!validPerms || validPerms.length === 0) {
      return res.status(400).json({ error: "Selecione ao menos uma permissão válida" });
    }

    const [perfil] = await db.insert(perfisAcessoTable).values({
      barbeariaId,
      descricao: descricao.trim(),
      tipo: validTipo,
      permissoes: validPerms,
    }).returning();

    if (Array.isArray(profissionalIds) && profissionalIds.length > 0) {
      const numericIds = profissionalIds.map(Number).filter(n => !isNaN(n));
      const validIds = await validateProfissionalIds(numericIds, barbeariaId);
      for (const pid of validIds) {
        await db.delete(profissionaisPerfisTable).where(eq(profissionaisPerfisTable.profissionalId, pid));
        await db.insert(profissionaisPerfisTable).values({ profissionalId: pid, perfilId: perfil.id });
      }
    }

    return res.status(201).json({
      ...perfil,
      permissoes: Array.isArray(perfil.permissoes) ? perfil.permissoes : [],
      profissionais: [],
      createdAt: perfil.createdAt.toISOString(),
      updatedAt: perfil.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("perfis-acesso create error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:perfilId", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const perfilId = parseInt(req.params.perfilId);
    if (isNaN(perfilId)) return res.status(400).json({ error: "ID inválido" });
    const { descricao, tipo, permissoes, profissionalIds } = req.body;

    const [existing] = await db.select().from(perfisAcessoTable).where(
      and(eq(perfisAcessoTable.id, perfilId), eq(perfisAcessoTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!existing) return res.status(404).json({ error: "Perfil não encontrado" });

    const validTipo = tipo && VALID_TIPOS.includes(tipo) ? tipo : existing.tipo;
    const validPerms = permissoes !== undefined ? validatePermissoes(permissoes) : null;
    if (permissoes !== undefined && (!validPerms || validPerms.length === 0)) {
      return res.status(400).json({ error: "Selecione ao menos uma permissão válida" });
    }

    const [updated] = await db.update(perfisAcessoTable).set({
      descricao: descricao?.trim() || existing.descricao,
      tipo: validTipo,
      permissoes: validPerms ?? existing.permissoes,
      updatedAt: new Date(),
    }).where(eq(perfisAcessoTable.id, perfilId)).returning();

    if (Array.isArray(profissionalIds)) {
      await db.delete(profissionaisPerfisTable).where(eq(profissionaisPerfisTable.perfilId, perfilId));
      const numericIds = profissionalIds.map(Number).filter(n => !isNaN(n));
      const validIds = await validateProfissionalIds(numericIds, barbeariaId);
      for (const pid of validIds) {
        await db.delete(profissionaisPerfisTable).where(eq(profissionaisPerfisTable.profissionalId, pid));
        await db.insert(profissionaisPerfisTable).values({ profissionalId: pid, perfilId: perfilId });
      }
    }

    return res.json({
      ...updated,
      permissoes: Array.isArray(updated.permissoes) ? updated.permissoes : [],
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("perfis-acesso update error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:perfilId", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const perfilId = parseInt(req.params.perfilId);
    if (isNaN(perfilId)) return res.status(400).json({ error: "ID inválido" });

    const [existing] = await db.select().from(perfisAcessoTable).where(
      and(eq(perfisAcessoTable.id, perfilId), eq(perfisAcessoTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!existing) return res.status(404).json({ error: "Perfil não encontrado" });

    await db.delete(profissionaisPerfisTable).where(eq(profissionaisPerfisTable.perfilId, perfilId));
    await db.delete(perfisAcessoTable).where(eq(perfisAcessoTable.id, perfilId));

    return res.json({ success: true });
  } catch (e) {
    console.error("perfis-acesso delete error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
