import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable, parametrosConfigTable, platformConfigTable, trialLinksTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { slugify } from "../lib/slugify.js";
import { PARAMETROS_DEFAULTS } from "./parametros.js";

const router: IRouter = Router();

function formatBarbearia(b: any) {
  return {
    ...b,
    createdAt: b.createdAt?.toISOString?.() ?? b.createdAt,
    updatedAt: b.updatedAt?.toISOString?.() ?? b.updatedAt,
    planoVencimento: b.planoVencimento?.toISOString?.() ?? b.planoVencimento,
  };
}

router.post("/", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const user = (req as any).user;
    const existing = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id));
    if (existing.length > 0) {
      return res.status(400).json({ error: "Você já possui uma barbearia" });
    }
    const { nome, telefone, email, cnpj, cep, logradouro, numero, bairro, cidade, uf } = req.body;
    if (!nome || !telefone) {
      return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
    }
    let baseSlug = slugify(nome);
    const existing2 = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, baseSlug));
    if (existing2.length > 0) {
      baseSlug = `${baseSlug}-${Date.now()}`;
    }
    const [trialDaysCfg] = await db.select().from(platformConfigTable).where(eq(platformConfigTable.chave, "trial_days")).limit(1);
    const trialDays = Math.min(90, Math.max(1, parseInt(trialDaysCfg?.valor || "7") || 7));
    const planoVencimento = new Date();
    planoVencimento.setDate(planoVencimento.getDate() + trialDays);

    const [barbearia] = await db.insert(barbeariasTable).values({
      donoId: user.id,
      nome,
      slug: baseSlug,
      telefone: telefone || null,
      email: email || null,
      cnpj: cnpj || null,
      cep: cep || null,
      logradouro: logradouro || null,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf || null,
      onboardingStep: 2,
      planoVencimento,
      subscriptionStatus: "trial",
      utmSource: user.utmSource || null,
      utmMedium: user.utmMedium || null,
      utmCampaign: user.utmCampaign || null,
      utmContent: user.utmContent || null,
      utmTerm: user.utmTerm || null,
      fbclid: user.fbclid || null,
      gclid: user.gclid || null,
      landingPage: user.landingPage || null,
      referrer: user.referrer || null,
    }).returning();

    try {
      const paramRows = PARAMETROS_DEFAULTS.map(p => ({
        barbeariaId: barbearia.id,
        chave: p.chave,
        valor: p.valorPadrao,
        tipo: p.tipo,
      }));
      await db.insert(parametrosConfigTable).values(paramRows);
    } catch (seedErr) {
      console.error("parametros seed error (non-fatal):", seedErr);
    }

    try {
      await db.update(trialLinksTable).set({
        usedByBarbeariaId: barbearia.id,
      }).where(
        and(
          eq(trialLinksTable.usedByUserId, user.id),
          eq(trialLinksTable.used, true)
        )
      );
    } catch (tlErr) {
      console.error("trial link barbearia update (non-fatal):", tlErr);
    }

    return res.status(201).json(formatBarbearia(barbearia));
  } catch (e) {
    console.error("createBarbearia error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });
    return res.json(formatBarbearia(barbearia));
  } catch (e) {
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/me", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const user = (req as any).user;
    const [existing] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Barbearia não encontrada" });
    const { nome, telefone, email, cnpj, cep, logradouro, numero, bairro, cidade, uf, corPrimaria, horarioFuncionamento, segmentacao, onboardingStep, logoUrl } = req.body;
    const [updated] = await db.update(barbeariasTable)
      .set({
        nome: nome ?? existing.nome,
        telefone: telefone ?? existing.telefone,
        email: email ?? existing.email,
        cnpj: cnpj ?? existing.cnpj,
        cep: cep ?? existing.cep,
        logradouro: logradouro ?? existing.logradouro,
        numero: numero ?? existing.numero,
        bairro: bairro ?? existing.bairro,
        cidade: cidade ?? existing.cidade,
        uf: uf ?? existing.uf,
        corPrimaria: corPrimaria ?? existing.corPrimaria,
        horarioFuncionamento: horarioFuncionamento ?? existing.horarioFuncionamento,
        segmentacao: segmentacao ?? existing.segmentacao,
        onboardingStep: onboardingStep ?? existing.onboardingStep,
        logoUrl: logoUrl !== undefined ? (logoUrl || null) : existing.logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(barbeariasTable.id, existing.id))
      .returning();
    if (horarioFuncionamento && Array.isArray(horarioFuncionamento)) {
      try {
        const activeDays = horarioFuncionamento.filter((d: any) => d.ativo);
        if (activeDays.length > 0) {
          const earliest = activeDays.reduce((min: string, d: any) => d.abertura < min ? d.abertura : min, activeDays[0].abertura);
          const latest = activeDays.reduce((max: string, d: any) => d.fechamento > max ? d.fechamento : max, activeDays[0].fechamento);
          for (const [chave, valor] of [["agenda_horario_inicio", earliest], ["agenda_horario_fim", latest]]) {
            const [existingParam] = await db.select().from(parametrosConfigTable).where(
              and(eq(parametrosConfigTable.barbeariaId, updated.id), eq(parametrosConfigTable.chave, chave))
            );
            if (existingParam) {
              await db.update(parametrosConfigTable).set({ valor }).where(eq(parametrosConfigTable.id, existingParam.id));
            } else {
              await db.insert(parametrosConfigTable).values({ barbeariaId: updated.id, chave, valor, tipo: "input" });
            }
          }
        }
      } catch (syncErr) {
        console.error("horario param sync error:", syncErr);
      }
    }

    return res.json(formatBarbearia(updated));
  } catch (e) {
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/me/tutorial-completo", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const user = (req as any).user;
    const [existing] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Barbearia não encontrada" });
    await db.update(barbeariasTable)
      .set({ tutorialCompleto: true, updatedAt: new Date() })
      .where(eq(barbeariasTable.id, existing.id));
    return res.json({ success: true });
  } catch (e) {
    console.error("tutorial-completo error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/me/tutorial-reset", requireAuth, requireRole("dono"), async (req, res) => {
  try {
    const user = (req as any).user;
    const [existing] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Barbearia não encontrada" });
    await db.update(barbeariasTable)
      .set({ tutorialCompleto: false, updatedAt: new Date() })
      .where(eq(barbeariasTable.id, existing.id));
    return res.json({ success: true });
  } catch (e) {
    console.error("tutorial-reset error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
