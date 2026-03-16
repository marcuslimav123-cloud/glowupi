import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { servicosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

async function checkAccess(req: any, res: any): Promise<number | null> {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) { res.status(400).json({ error: "ID inválido" }); return null; }
  const [b] = await db.select().from(barbeariasTable).where(and(eq(barbeariasTable.id, barbeariaId), eq(barbeariasTable.donoId, req.user.id))).limit(1);
  if (!b) { res.status(403).json({ error: "Acesso negado" }); return null; }
  return barbeariaId;
}

function formatServico(s: any) {
  return { ...s, preco: parseFloat(s.preco), createdAt: s.createdAt?.toISOString?.() ?? s.createdAt, updatedAt: s.updatedAt?.toISOString?.() ?? s.updatedAt };
}

router.get("/", async (req, res) => {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return res.status(400).json({ error: "ID inválido" });
  const servicos = await db.select().from(servicosTable).where(eq(servicosTable.barbeariaId, barbeariaId));
  return res.json(servicos.map(formatServico));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, preco, duracaoMinutos, descricao } = req.body;
  if (!nome || preco === undefined) return res.status(400).json({ error: "Dados inválidos" });
  const [servico] = await db.insert(servicosTable).values({
    barbeariaId,
    nome,
    preco: String(preco),
    duracaoMinutos: duracaoMinutos || 30,
    descricao: descricao || null,
  }).returning();
  return res.status(201).json(formatServico(servico));
});

router.put("/:servicoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.servicoId);
  const { nome, preco, duracaoMinutos, descricao, ativo, ordem } = req.body;
  const [existing] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, id), eq(servicosTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Serviço não encontrado" });
  const [updated] = await db.update(servicosTable).set({
    nome: nome ?? existing.nome,
    preco: preco !== undefined ? String(preco) : existing.preco,
    duracaoMinutos: duracaoMinutos ?? existing.duracaoMinutos,
    descricao: descricao ?? existing.descricao,
    ativo: ativo !== undefined ? ativo : existing.ativo,
    ordem: ordem !== undefined ? ordem : existing.ordem,
    updatedAt: new Date(),
  }).where(eq(servicosTable.id, id)).returning();
  return res.json(formatServico(updated));
});

router.delete("/:servicoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.servicoId);
  await db.delete(servicosTable).where(and(eq(servicosTable.id, id), eq(servicosTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Serviço removido" });
});

export default router;
