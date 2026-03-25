import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientesTable, mensagensTable, solicitacoesCadastroTable, usersTable } from "@workspace/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

router.get("/aniversariantes", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
  const diaAtual = String(hoje.getDate()).padStart(2, "0");
  const mmdd = `${mesAtual}-${diaAtual}`;

  const clientes = await db.select().from(clientesTable).where(
    and(eq(clientesTable.barbeariaId, barbeariaId))
  );

  const aniversariantes = clientes.filter(c => {
    if (!c.aniversario) return false;
    const parts = c.aniversario.slice(5);
    return parts === mmdd;
  });

  const proximos7dias: typeof aniversariantes = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const target = `${mm}-${dd}`;
    clientes.forEach(c => {
      if (c.aniversario && c.aniversario.slice(5) === target) {
        proximos7dias.push(c);
      }
    });
  }

  return res.json({
    hoje: aniversariantes.map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone, aniversario: c.aniversario })),
    semana: proximos7dias.map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone, aniversario: c.aniversario })),
  });
});

router.get("/mensagens", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const mensagens = await db.select().from(mensagensTable)
    .where(and(
      eq(mensagensTable.barbeariaId, barbeariaId),
      eq(mensagensTable.status, "rascunho")
    ))
    .orderBy(desc(mensagensTable.createdAt))
    .limit(10);
  return res.json(mensagens.map(m => ({
    id: m.id,
    titulo: m.titulo,
    tipo: m.tipo,
    status: m.status,
    dataEnvio: m.dataEnvio?.toISOString() || null,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.get("/solicitacoes", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { status } = req.query;
  const conditions = [eq(solicitacoesCadastroTable.barbeariaId, barbeariaId)];
  if (status && status !== "todos") {
    conditions.push(eq(solicitacoesCadastroTable.status, status as string));
  }
  const solicitacoes = await db.select().from(solicitacoesCadastroTable)
    .where(and(...conditions))
    .orderBy(desc(solicitacoesCadastroTable.createdAt));
  return res.json(solicitacoes.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
});

router.put("/solicitacoes/:id", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["aprovado", "reprovado"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }
  const [sol] = await db.select().from(solicitacoesCadastroTable).where(
    and(eq(solicitacoesCadastroTable.id, id), eq(solicitacoesCadastroTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!sol) return res.status(404).json({ error: "Solicitação não encontrada" });

  if (status === "aprovado") {
    await db.insert(clientesTable).values({
      barbeariaId,
      nome: sol.nome,
      telefone: sol.telefone,
      email: sol.email || null,
    });
  }

  const [updated] = await db.update(solicitacoesCadastroTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(solicitacoesCadastroTable.id, id))
    .returning();
  return res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
