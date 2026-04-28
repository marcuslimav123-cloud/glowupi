import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mensagensPadraoTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import {
  CATEGORIAS_VALIDAS, isCategoriaValida, buildContexto, renderConteudo,
} from "../lib/mensagensRender.js";

const router: IRouter = Router({ mergeParams: true });

function fmtModelo(m: any) {
  return { ...m, createdAt: m.createdAt?.toISOString?.() ?? m.createdAt };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const { categoria, favorito, arquivado } = req.query as Record<string, string | undefined>;

    const conds: any[] = [eq(mensagensPadraoTable.barbeariaId, barbeariaId)];
    if (categoria && isCategoriaValida(categoria)) {
      conds.push(eq(mensagensPadraoTable.categoria, categoria));
    }
    if (favorito === "true" || favorito === "false") {
      conds.push(eq(mensagensPadraoTable.favorito, favorito === "true"));
    }
    if (arquivado === "true" || arquivado === "false") {
      conds.push(eq(mensagensPadraoTable.arquivado, arquivado === "true"));
    }

    const rows = await db.select().from(mensagensPadraoTable)
      .where(and(...conds))
      .orderBy(desc(mensagensPadraoTable.favorito), desc(mensagensPadraoTable.createdAt));
    return res.json(rows.map(fmtModelo));
  } catch (e) {
    console.error("listMensagensPadrao error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const { titulo, conteudo, categoria, tipo, favorito, arquivado, ativo } = req.body || {};
    if (!titulo || !conteudo || !categoria) {
      return res.status(400).json({ error: "Título, conteúdo e categoria são obrigatórios" });
    }
    if (!isCategoriaValida(categoria)) {
      return res.status(400).json({ error: `Categoria inválida. Use uma de: ${CATEGORIAS_VALIDAS.join(", ")}` });
    }
    const [row] = await db.insert(mensagensPadraoTable).values({
      barbeariaId,
      tipo: typeof tipo === "string" && tipo ? tipo : categoria,
      titulo: String(titulo).trim(),
      conteudo: String(conteudo),
      categoria,
      favorito: !!favorito,
      arquivado: !!arquivado,
      ativo: ativo !== false,
    }).returning();
    return res.status(201).json(fmtModelo(row));
  } catch (e) {
    console.error("createMensagemPadrao error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/:modeloId", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const id = parseInt(String(req.params.modeloId));
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const [existing] = await db.select().from(mensagensPadraoTable)
      .where(and(eq(mensagensPadraoTable.id, id), eq(mensagensPadraoTable.barbeariaId, barbeariaId))).limit(1);
    if (!existing) return res.status(404).json({ error: "Modelo não encontrado" });

    const { titulo, conteudo, categoria, tipo, favorito, arquivado, ativo } = req.body || {};
    if (categoria !== undefined && !isCategoriaValida(categoria)) {
      return res.status(400).json({ error: `Categoria inválida. Use uma de: ${CATEGORIAS_VALIDAS.join(", ")}` });
    }
    const [updated] = await db.update(mensagensPadraoTable).set({
      titulo: titulo !== undefined ? String(titulo).trim() : existing.titulo,
      conteudo: conteudo !== undefined ? String(conteudo) : existing.conteudo,
      categoria: categoria ?? existing.categoria,
      tipo: tipo !== undefined ? String(tipo) : existing.tipo,
      favorito: favorito !== undefined ? !!favorito : existing.favorito,
      arquivado: arquivado !== undefined ? !!arquivado : existing.arquivado,
      ativo: ativo !== undefined ? !!ativo : existing.ativo,
    }).where(eq(mensagensPadraoTable.id, id)).returning();
    return res.json(fmtModelo(updated));
  } catch (e) {
    console.error("updateMensagemPadrao error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/:modeloId", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const id = parseInt(String(req.params.modeloId));
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    await db.delete(mensagensPadraoTable)
      .where(and(eq(mensagensPadraoTable.id, id), eq(mensagensPadraoTable.barbeariaId, barbeariaId)));
    return res.json({ success: true });
  } catch (e) {
    console.error("deleteMensagemPadrao error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:modeloId/duplicar", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const id = parseInt(String(req.params.modeloId));
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const [orig] = await db.select().from(mensagensPadraoTable)
      .where(and(eq(mensagensPadraoTable.id, id), eq(mensagensPadraoTable.barbeariaId, barbeariaId))).limit(1);
    if (!orig) return res.status(404).json({ error: "Modelo não encontrado" });
    const [copy] = await db.insert(mensagensPadraoTable).values({
      barbeariaId,
      tipo: orig.tipo,
      titulo: `${orig.titulo} (cópia)`,
      conteudo: orig.conteudo,
      categoria: orig.categoria,
      favorito: false,
      arquivado: false,
      ativo: true,
    }).returning();
    return res.status(201).json(fmtModelo(copy));
  } catch (e) {
    console.error("duplicarMensagemPadrao error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:modeloId/render", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const id = parseInt(String(req.params.modeloId));
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const [modelo] = await db.select().from(mensagensPadraoTable)
      .where(and(eq(mensagensPadraoTable.id, id), eq(mensagensPadraoTable.barbeariaId, barbeariaId))).limit(1);
    if (!modelo) return res.status(404).json({ error: "Modelo não encontrado" });

    const { agendamentoId, clienteId, overrides } = req.body || {};
    const ctx = await buildContexto(barbeariaId, {
      agendamentoId: agendamentoId ? parseInt(agendamentoId) : null,
      clienteId: clienteId ? parseInt(clienteId) : null,
      overrides: overrides && typeof overrides === "object" ? overrides : undefined,
    });
    const conteudo = renderConteudo(modelo.conteudo, ctx);
    return res.json({ conteudo });
  } catch (e) {
    console.error("renderMensagemPadrao error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
