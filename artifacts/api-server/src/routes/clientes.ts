import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientesTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function formatCliente(c: any) {
  return { ...c, totalGasto: parseFloat(c.totalGasto), createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
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
  const user = (req as any).user;
  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador" && params["cliente_cadastro_nao_gestor"] !== "Sim") {
    return res.status(403).json({ error: "Cadastro de cliente não permitido para seu perfil" });
  }

  const { nome, telefone, email, aniversario, observacoes, vip } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: "Nome e telefone são obrigatórios" });

  if (params["cliente_controle_celular"] === "Sim") {
    const existente = await db.select().from(clientesTable).where(
      and(eq(clientesTable.barbeariaId, barbeariaId), eq(clientesTable.telefone, telefone))
    );
    if (existente.length > 0) {
      return res.status(409).json({ error: "Já existe um cliente cadastrado com este número de celular" });
    }
  }

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

router.get("/:clienteId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.clienteId);
  const [cliente] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, id), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
  return res.json(formatCliente(cliente));
});

router.put("/:clienteId", requireAuth, requireRole("dono", "gerente"), async (req, res) => {
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
