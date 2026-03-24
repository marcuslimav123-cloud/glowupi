import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { slugify } from "../lib/slugify.js";

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
    const planoVencimento = new Date();
    planoVencimento.setDate(planoVencimento.getDate() + 30);
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
    }).returning();
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
    const { nome, telefone, email, cnpj, cep, logradouro, numero, bairro, cidade, uf, corPrimaria, horarioFuncionamento } = req.body;
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
        updatedAt: new Date(),
      })
      .where(eq(barbeariasTable.id, existing.id))
      .returning();
    return res.json(formatBarbearia(updated));
  } catch (e) {
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
