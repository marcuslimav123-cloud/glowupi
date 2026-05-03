import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { avaliacoesTable, barbeariasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";
import { sendPushToBarbearia } from "../lib/pushNotifications.js";

const router: IRouter = Router({ mergeParams: true });

function formatAvaliacao(a: any) {
  return { ...a, createdAt: a.createdAt?.toISOString?.() ?? a.createdAt };
}

router.get("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const avaliacoes = await db.select().from(avaliacoesTable).where(eq(avaliacoesTable.barbeariaId, barbeariaId));
  res.json(avaliacoes.map(formatAvaliacao));
});

router.get("/individual", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  if (params["avaliacao_individual"] !== "Sim") {
    return res.json({ habilitado: false, grupos: [] });
  }
  const avaliacoes = await db.select().from(avaliacoesTable).where(eq(avaliacoesTable.barbeariaId, barbeariaId));
  const porProfissional: Record<string, { profissionalId: number | null; profissionalNome: string; avaliacoes: any[]; notaMedia: number; total: number }> = {};
  for (const a of avaliacoes) {
    const key = a.profissionalNome || "Geral";
    if (!porProfissional[key]) {
      porProfissional[key] = { profissionalId: a.profissionalId, profissionalNome: key, avaliacoes: [], notaMedia: 0, total: 0 };
    }
    porProfissional[key].avaliacoes.push(formatAvaliacao(a));
    porProfissional[key].total++;
  }
  for (const key of Object.keys(porProfissional)) {
    const g = porProfissional[key];
    g.notaMedia = g.total > 0 ? Math.round((g.avaliacoes.reduce((s: number, a: any) => s + a.nota, 0) / g.total) * 10) / 10 : 0;
  }
  return res.json({ habilitado: true, grupos: Object.values(porProfissional) });
});

router.post("/", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { agendamentoId, clienteNome, profissionalId, profissionalNome, nota, comentario } = req.body;
  if (nota < 1 || nota > 5) { res.status(400).json({ error: "Nota deve ser entre 1 e 5" }); return; }
  const [avaliacao] = await db.insert(avaliacoesTable).values({
    barbeariaId, agendamentoId, clienteNome, profissionalId, profissionalNome, nota, comentario
  }).returning();

  const estrelas = "★".repeat(Math.max(1, Math.min(5, Number(nota) || 0)));
  sendPushToBarbearia(barbeariaId, {
    title: `Nova avaliação ${estrelas}`,
    body: `${clienteNome || "Cliente"}${profissionalNome ? ` para ${profissionalNome}` : ""}${comentario ? `: ${String(comentario).slice(0, 80)}` : ""}`,
    data: { type: "avaliacao_nova", avaliacaoId: avaliacao.id, profissionalId, url: "/relatorios/avaliacoes", route: "/relatorios" },
  }).catch(err => console.error("[Push] Error on avaliacao:", err));

  res.status(201).json(formatAvaliacao(avaliacao));
});

router.post("/enviar-whatsapp", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  if (params["notif_avaliacao_whatsapp"] !== "Sim") {
    return res.status(400).json({ error: "Envio de avaliação por WhatsApp está desabilitado" });
  }
  const { clienteNome, clienteTelefone } = req.body;
  if (!clienteNome || !clienteTelefone) return res.status(400).json({ error: "clienteNome e clienteTelefone são obrigatórios" });
  return res.json({ success: true, canal: "whatsapp", message: "Link de avaliação por WhatsApp preparado (serviço externo não configurado)" });
});

export default router;
