import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientesTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

async function checkAccess(req: any, res: any): Promise<number | null> {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) { res.status(400).json({ error: "ID inválido" }); return null; }
  const [b] = await db.select().from(barbeariasTable).where(and(eq(barbeariasTable.id, barbeariaId), eq(barbeariasTable.donoId, req.user.id))).limit(1);
  if (!b) { res.status(403).json({ error: "Acesso negado" }); return null; }
  return barbeariaId;
}

function formatCliente(c: any) {
  return { ...c, totalGasto: parseFloat(c.totalGasto), createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt };
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const search = req.query.search as string;
  let clientes;
  if (search) {
    clientes = await db.select().from(clientesTable).where(and(eq(clientesTable.barbeariaId, barbeariaId), or(ilike(clientesTable.nome, `%${search}%`), ilike(clientesTable.telefone, `%${search}%`))));
  } else {
    clientes = await db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));
  }
  return res.json(clientes.map(formatCliente));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, telefone, email, aniversario, observacoes, vip } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
  const [cliente] = await db.insert(clientesTable).values({
    barbeariaId,
    nome,
    telefone,
    email: email || null,
    aniversario: aniversario || null,
    observacoes: observacoes || null,
    vip: vip ?? false,
  }).returning();
  return res.status(201).json(formatCliente(cliente));
});

router.get("/:clienteId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.clienteId);
  const [cliente] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, id), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
  return res.json(formatCliente(cliente));
});

router.put("/:clienteId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.clienteId);
  const { nome, telefone, email, aniversario, observacoes, vip } = req.body;
  const [existing] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, id), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Cliente não encontrado" });
  const [updated] = await db.update(clientesTable).set({
    nome: nome ?? existing.nome,
    telefone: telefone ?? existing.telefone,
    email: email ?? existing.email,
    aniversario: aniversario ?? existing.aniversario,
    observacoes: observacoes ?? existing.observacoes,
    vip: vip !== undefined ? vip : existing.vip,
    updatedAt: new Date(),
  }).where(eq(clientesTable.id, id)).returning();
  return res.json(formatCliente(updated));
});

export default router;
