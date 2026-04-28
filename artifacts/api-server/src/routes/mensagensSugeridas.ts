import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  mensagensSugeridasTable, agendamentosTable, clientesTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import { isModoHumanoAtivo, criarSugerida } from "../lib/mensagensSugeridas.js";
import { getParametros, getLocalNow } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

function fmt(s: any) {
  return {
    ...s,
    createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
    resolvedAt: s.resolvedAt?.toISOString?.() ?? s.resolvedAt ?? null,
  };
}

async function enrich(rows: any[]) {
  return Promise.all(rows.map(async (r) => {
    let agend: any = null;
    let cli: any = null;
    if (r.agendamentoId) {
      [agend] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, r.agendamentoId)).limit(1);
    }
    if (r.clienteId) {
      [cli] = await db.select().from(clientesTable).where(eq(clientesTable.id, r.clienteId)).limit(1);
    } else if (agend?.clienteId) {
      [cli] = await db.select().from(clientesTable).where(eq(clientesTable.id, agend.clienteId)).limit(1);
    }
    return {
      ...fmt(r),
      clienteNome: cli?.nome ?? agend?.clienteNome ?? null,
      clienteEmail: cli?.email ?? null,
      clienteTelefone: cli?.telefone ?? agend?.clienteTelefone ?? null,
      agendamentoData: agend?.data ?? null,
      agendamentoHora: agend?.horaInicio ?? null,
      servicoNome: agend?.servicoNome ?? null,
      profissionalNome: agend?.profissionalNome ?? null,
    };
  }));
}

async function gerarAniversariantesDoDia(barbeariaId: number) {
  try {
    const params = await getParametros(barbeariaId);
    const { todayStr } = getLocalNow(params);
    const mmdd = todayStr.slice(5);
    const clientesBarbearia = await db.select().from(clientesTable).where(eq(clientesTable.barbeariaId, barbeariaId));
    const aniversariantes = clientesBarbearia.filter(c => c.aniversario && c.aniversario.length >= 10 && c.aniversario.slice(5, 10) === mmdd);
    for (const c of aniversariantes) {
      await criarSugerida({
        barbeariaId,
        tipo: "aniversario",
        clienteId: c.id,
        contexto: { aniversario: c.aniversario, telefone: c.telefone, email: c.email },
        dedupeKey: `anivers:${barbeariaId}:${c.id}:${todayStr}`,
        fallbackTexto: `Olá ${c.nome}! Hoje é seu aniversário e queremos te desejar tudo de melhor! 🎂`,
        categoriaPreferida: "aniversario",
      });
    }
  } catch (e) {
    console.error("[sugeridas] aniversariantes generation error:", e);
  }
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    if (await isModoHumanoAtivo(barbeariaId)) {
      await gerarAniversariantesDoDia(barbeariaId);
    }
    const status = (req.query.status as string | undefined) || "pendente";
    const conds: any[] = [eq(mensagensSugeridasTable.barbeariaId, barbeariaId)];
    if (status !== "todos") {
      conds.push(eq(mensagensSugeridasTable.status, status));
    }
    const rows = await db.select().from(mensagensSugeridasTable)
      .where(and(...conds))
      .orderBy(desc(mensagensSugeridasTable.createdAt));
    const enriched = await enrich(rows);
    return res.json(enriched);
  } catch (e) {
    console.error("listMensagensSugeridas error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/count", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    if (await isModoHumanoAtivo(barbeariaId)) {
      await gerarAniversariantesDoDia(barbeariaId);
    }
    const rows = await db.select({ id: mensagensSugeridasTable.id }).from(mensagensSugeridasTable).where(
      and(eq(mensagensSugeridasTable.barbeariaId, barbeariaId), eq(mensagensSugeridasTable.status, "pendente"))
    );
    return res.json({ count: rows.length });
  } catch (e) {
    console.error("countMensagensSugeridas error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:sugeridaId/enviar", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const id = parseInt(String(req.params.sugeridaId));
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const [existing] = await db.select().from(mensagensSugeridasTable)
      .where(and(eq(mensagensSugeridasTable.id, id), eq(mensagensSugeridasTable.barbeariaId, barbeariaId))).limit(1);
    if (!existing) return res.status(404).json({ error: "Sugerida não encontrada" });
    if (existing.status !== "pendente") {
      return res.status(400).json({ error: "Mensagem já foi resolvida" });
    }
    const conteudo = typeof req.body?.conteudo === "string" ? req.body.conteudo : existing.conteudoSugerido;
    const [updated] = await db.update(mensagensSugeridasTable).set({
      status: "enviada",
      conteudoSugerido: conteudo,
      resolvedAt: new Date(),
    }).where(eq(mensagensSugeridasTable.id, id)).returning();
    return res.json(fmt(updated));
  } catch (e) {
    console.error("enviarMensagemSugerida error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/:sugeridaId/descartar", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;
    const id = parseInt(String(req.params.sugeridaId));
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    const [existing] = await db.select().from(mensagensSugeridasTable)
      .where(and(eq(mensagensSugeridasTable.id, id), eq(mensagensSugeridasTable.barbeariaId, barbeariaId))).limit(1);
    if (!existing) return res.status(404).json({ error: "Sugerida não encontrada" });
    if (existing.status !== "pendente") {
      return res.status(400).json({ error: "Mensagem já foi resolvida" });
    }
    const [updated] = await db.update(mensagensSugeridasTable).set({
      status: "descartada",
      resolvedAt: new Date(),
    }).where(eq(mensagensSugeridasTable.id, id)).returning();
    return res.json(fmt(updated));
  } catch (e) {
    console.error("descartarMensagemSugerida error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
