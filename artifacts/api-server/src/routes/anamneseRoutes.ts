import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  tipoAnamneseTable,
  anamneseFormulariosTable,
  anamneseClientesTable,
  anamneseFotosTable,
  anamneseConsentimentosTable,
  clientesTable,
  agendamentosTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(r: any) {
  return {
    ...r,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
    preenchidoEm: r.preenchidoEm?.toISOString?.() ?? r.preenchidoEm,
    dataRegistro: r.dataRegistro?.toISOString?.() ?? r.dataRegistro,
    aceitoEm: r.aceitoEm?.toISOString?.() ?? r.aceitoEm,
  };
}

router.get("/tipos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(tipoAnamneseTable).where(eq(tipoAnamneseTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/tipos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { nome, descricao, ativo } = req.body;
  const [row] = await db.insert(tipoAnamneseTable).values({ barbeariaId, nome, descricao, ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/tipos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = {};
  if (req.body.nome !== undefined) updates.nome = req.body.nome;
  if (req.body.descricao !== undefined) updates.descricao = req.body.descricao;
  if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;
  const [row] = await db.update(tipoAnamneseTable).set(updates).where(and(eq(tipoAnamneseTable.id, id), eq(tipoAnamneseTable.barbeariaId, barbeariaId))).returning();
  res.json(fmt(row));
});

router.delete("/tipos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(tipoAnamneseTable).where(and(eq(tipoAnamneseTable.id, parseInt(req.params.id)), eq(tipoAnamneseTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/formularios", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const rows = await db.select().from(anamneseFormulariosTable).where(eq(anamneseFormulariosTable.barbeariaId, barbeariaId));
  res.json(rows.map(fmt));
});

router.post("/formularios", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { tipoId, titulo, campos, ativo } = req.body;
  const [row] = await db.insert(anamneseFormulariosTable).values({ barbeariaId, tipoId, titulo, campos: campos || [], ativo }).returning();
  res.status(201).json(fmt(row));
});

router.put("/formularios/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const updates: any = { updatedAt: new Date() };
  if (req.body.titulo !== undefined) updates.titulo = req.body.titulo;
  if (req.body.campos !== undefined) updates.campos = req.body.campos;
  if (req.body.ativo !== undefined) updates.ativo = req.body.ativo;
  if (req.body.tipoId !== undefined) updates.tipoId = req.body.tipoId;
  const [row] = await db.update(anamneseFormulariosTable).set(updates).where(and(eq(anamneseFormulariosTable.id, id), eq(anamneseFormulariosTable.barbeariaId, barbeariaId))).returning();
  res.json(fmt(row));
});

router.delete("/formularios/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(anamneseFormulariosTable).where(and(eq(anamneseFormulariosTable.id, parseInt(req.params.id)), eq(anamneseFormulariosTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/clientes/:clienteId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const rows = await db.select().from(anamneseClientesTable)
    .where(and(eq(anamneseClientesTable.clienteId, clienteId), eq(anamneseClientesTable.barbeariaId, barbeariaId)))
    .orderBy(desc(anamneseClientesTable.preenchidoEm));
  res.json(rows.map(fmt));
});

router.post("/clientes", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, formularioId, respostas, observacoes, preenchidoPor } = req.body;
  const [row] = await db.insert(anamneseClientesTable).values({
    barbeariaId, clienteId, formularioId,
    respostas: respostas || {},
    observacoes, preenchidoPor,
  }).returning();
  res.status(201).json(fmt(row));
});

router.delete("/clientes/ficha/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(anamneseClientesTable).where(and(eq(anamneseClientesTable.id, parseInt(req.params.id)), eq(anamneseClientesTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/clientes/:clienteId/perfil-completo", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);

  const [cliente] = await db.select().from(clientesTable)
    .where(and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId)));
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

  const fichas = await db.select().from(anamneseClientesTable)
    .where(and(eq(anamneseClientesTable.clienteId, clienteId), eq(anamneseClientesTable.barbeariaId, barbeariaId)))
    .orderBy(desc(anamneseClientesTable.preenchidoEm));

  const fotos = await db.select().from(anamneseFotosTable)
    .where(and(eq(anamneseFotosTable.clienteId, clienteId), eq(anamneseFotosTable.barbeariaId, barbeariaId)))
    .orderBy(desc(anamneseFotosTable.dataRegistro));

  const consentimentos = await db.select().from(anamneseConsentimentosTable)
    .where(and(eq(anamneseConsentimentosTable.clienteId, clienteId), eq(anamneseConsentimentosTable.barbeariaId, barbeariaId)))
    .orderBy(desc(anamneseConsentimentosTable.createdAt));

  const formularios = await db.select().from(anamneseFormulariosTable)
    .where(eq(anamneseFormulariosTable.barbeariaId, barbeariaId));

  let historico: any[] = [];
  try {
    historico = await db.select().from(agendamentosTable)
      .where(and(eq(agendamentosTable.clienteId, clienteId), eq(agendamentosTable.barbeariaId, barbeariaId)))
      .orderBy(desc(agendamentosTable.data));
  } catch {}

  res.json({
    cliente: fmt(cliente),
    fichas: fichas.map(fmt),
    fotos: fotos.map(fmt),
    consentimentos: consentimentos.map(fmt),
    formularios: formularios.map(fmt),
    historico: historico.slice(0, 50).map(fmt),
  });
});

router.put("/clientes/:clienteId/saude", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const { alergias, contraindicacoes } = req.body;
  const [row] = await db.update(clientesTable)
    .set({ alergias, contraindicacoes, updatedAt: new Date() })
    .where(and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId)))
    .returning();
  res.json(fmt(row));
});

router.get("/fotos/:clienteId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const rows = await db.select().from(anamneseFotosTable)
    .where(and(eq(anamneseFotosTable.clienteId, clienteId), eq(anamneseFotosTable.barbeariaId, barbeariaId)))
    .orderBy(desc(anamneseFotosTable.dataRegistro));
  res.json(rows.map(fmt));
});

router.post("/fotos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, tipo, fotoUrl, descricao, procedimento, grupoId } = req.body;
  if (!clienteId || !fotoUrl) return res.status(400).json({ error: "clienteId e fotoUrl são obrigatórios" });
  const [row] = await db.insert(anamneseFotosTable).values({
    barbeariaId, clienteId, tipo: tipo || "antes", fotoUrl, descricao, procedimento,
    grupoId: grupoId || `grupo_${Date.now()}`,
  }).returning();
  res.status(201).json(fmt(row));
});

router.delete("/fotos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(anamneseFotosTable).where(and(eq(anamneseFotosTable.id, parseInt(req.params.id)), eq(anamneseFotosTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

router.get("/consentimentos/:clienteId", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const clienteId = parseInt(req.params.clienteId);
  const rows = await db.select().from(anamneseConsentimentosTable)
    .where(and(eq(anamneseConsentimentosTable.clienteId, clienteId), eq(anamneseConsentimentosTable.barbeariaId, barbeariaId)))
    .orderBy(desc(anamneseConsentimentosTable.createdAt));
  res.json(rows.map(fmt));
});

router.post("/consentimentos", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, titulo, termoTexto, assinaturaUrl, aceito } = req.body;
  if (!clienteId || !titulo || !termoTexto) return res.status(400).json({ error: "clienteId, titulo e termoTexto são obrigatórios" });
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
  const accepted = aceito ?? true;
  const [row] = await db.insert(anamneseConsentimentosTable).values({
    barbeariaId, clienteId, titulo, termoTexto, assinaturaUrl,
    aceito: accepted,
    ipAddress: typeof ip === "string" ? ip : null,
    aceitoEm: accepted ? new Date() : null,
  }).returning();
  res.status(201).json(fmt(row));
});

router.delete("/consentimentos/:id", requireAuth, async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  await db.delete(anamneseConsentimentosTable).where(and(eq(anamneseConsentimentosTable.id, parseInt(req.params.id)), eq(anamneseConsentimentosTable.barbeariaId, barbeariaId)));
  res.json({ success: true });
});

export default router;
