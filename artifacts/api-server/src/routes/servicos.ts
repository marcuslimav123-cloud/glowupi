import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { servicosTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function formatServico(s: any) {
  return {
    ...s,
    preco: parseFloat(s.preco),
    comissaoPorcentagem: s.comissaoPorcentagem != null ? parseFloat(s.comissaoPorcentagem) : null,
    createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
    updatedAt: s.updatedAt?.toISOString?.() ?? s.updatedAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const servicos = await db.select().from(servicosTable).where(eq(servicosTable.barbeariaId, barbeariaId));
  return res.json(servicos.map(formatServico));
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const {
    nome, preco, duracaoMinutos, descricao,
    diasRetorno, mensagemRetorno, tipoPreco,
    imagemUrl, disponivelOnline,
    fidelidadeAtiva, pontosAcumular, pontosResgate,
    comissaoPorcentagem,
  } = req.body;
  if (!nome || preco === undefined) return res.status(400).json({ error: "Dados inválidos" });
  const [servico] = await db.insert(servicosTable).values({
    barbeariaId,
    nome,
    preco: String(preco),
    duracaoMinutos: duracaoMinutos ?? 30,
    descricao: descricao ?? null,
    diasRetorno: diasRetorno ?? null,
    mensagemRetorno: mensagemRetorno ?? null,
    tipoPreco: tipoPreco ?? "fixo",
    imagemUrl: imagemUrl ?? null,
    disponivelOnline: disponivelOnline ?? true,
    fidelidadeAtiva: fidelidadeAtiva ?? false,
    pontosAcumular: pontosAcumular ?? 1,
    pontosResgate: pontosResgate ?? 10,
    comissaoPorcentagem: comissaoPorcentagem != null ? String(comissaoPorcentagem) : null,
  }).returning();
  return res.status(201).json(formatServico(servico));
});

router.put("/:servicoId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.servicoId);
  const {
    nome, preco, duracaoMinutos, descricao, ativo, ordem,
    diasRetorno, mensagemRetorno, tipoPreco,
    imagemUrl, disponivelOnline,
    fidelidadeAtiva, pontosAcumular, pontosResgate,
    comissaoPorcentagem,
  } = req.body;
  const [existing] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, id), eq(servicosTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Serviço não encontrado" });

  const [updated] = await db.update(servicosTable).set({
    nome: nome ?? existing.nome,
    preco: preco !== undefined ? String(preco) : existing.preco,
    duracaoMinutos: duracaoMinutos ?? existing.duracaoMinutos,
    descricao: descricao !== undefined ? descricao : existing.descricao,
    ativo: ativo !== undefined ? ativo : existing.ativo,
    ordem: ordem !== undefined ? ordem : existing.ordem,
    diasRetorno: diasRetorno !== undefined ? diasRetorno : existing.diasRetorno,
    mensagemRetorno: mensagemRetorno !== undefined ? mensagemRetorno : existing.mensagemRetorno,
    tipoPreco: tipoPreco ?? existing.tipoPreco,
    imagemUrl: imagemUrl !== undefined ? imagemUrl : existing.imagemUrl,
    disponivelOnline: disponivelOnline !== undefined ? disponivelOnline : existing.disponivelOnline,
    fidelidadeAtiva: fidelidadeAtiva !== undefined ? fidelidadeAtiva : existing.fidelidadeAtiva,
    pontosAcumular: pontosAcumular !== undefined ? pontosAcumular : existing.pontosAcumular,
    pontosResgate: pontosResgate !== undefined ? pontosResgate : existing.pontosResgate,
    comissaoPorcentagem: comissaoPorcentagem !== undefined ? (comissaoPorcentagem !== null ? String(comissaoPorcentagem) : null) : existing.comissaoPorcentagem,
    updatedAt: new Date(),
  }).where(eq(servicosTable.id, id)).returning();
  return res.json(formatServico(updated));
});

router.delete("/:servicoId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.servicoId);
  await db.delete(servicosTable).where(and(eq(servicosTable.id, id), eq(servicosTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Serviço removido" });
});

export default router;
