import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  mensagensAgendamentoTable, agendamentosTable, barbeariasTable,
  clienteUsersTable, clientePushTokensTable, clientesTable
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireClient, requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:marcuslimav123@gmail.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function sendPushToCliente(clienteUserId: number, barbeariaId: number, title: string, body: string, data?: Record<string, any>) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    const tokens = await db.select().from(clientePushTokensTable).where(
      and(
        eq(clientePushTokensTable.clienteUserId, clienteUserId),
        eq(clientePushTokensTable.ativo, true)
      )
    );
    const payload = JSON.stringify({
      title,
      body,
      data: data || {},
      icon: "/favicon.svg",
      tag: `agendamento-msg-${Date.now()}`,
    });
    const pushOptions = { TTL: 60 * 60, urgency: "high" as const };
    for (const tokenRecord of tokens) {
      try {
        const subscription = JSON.parse(tokenRecord.token);
        await webpush.sendNotification(subscription, payload, pushOptions);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.update(clientePushTokensTable).set({ ativo: false, updatedAt: new Date() })
            .where(eq(clientePushTokensTable.id, tokenRecord.id));
        }
      }
    }
  } catch (err) {
    console.error("[Push] Error sending push to cliente:", err);
  }
}

const clientRouter: IRouter = Router();

async function handleClientSendMessage(req: any, res: any) {
  try {
    const clienteUser = req.clienteUser;
    const { agendamentoId, mensagem, barbeariaId } = req.body;
    if (!agendamentoId || !mensagem || !barbeariaId) {
      return res.status(400).json({ error: "agendamentoId, mensagem e barbeariaId são obrigatórios" });
    }

    const params = await getParametros(barbeariaId);
    if (params["notif_cliente_mensagem"] !== "Sim") {
      return res.status(403).json({ error: "Mensagens de agendamento estão desativadas para este estabelecimento" });
    }

    const [agend] = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.id, agendamentoId), eq(agendamentosTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

    const [clienteRecord] = await db.select().from(clientesTable).where(
      eq(clientesTable.id, agend.clienteId)
    ).limit(1);
    if (!clienteRecord || clienteRecord.email !== clienteUser.email) {
      return res.status(403).json({ error: "Agendamento não pertence a este cliente" });
    }

    const [msg] = await db.insert(mensagensAgendamentoTable).values({
      agendamentoId,
      clienteUserId: clienteUser.id,
      barbeariaId,
      remetente: "cliente",
      mensagem: mensagem.trim(),
      lida: false,
    }).returning();

    return res.status(201).json(msg);
  } catch (e) {
    console.error("agendamento-mensagens enviar error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
}

clientRouter.post("/", requireClient, handleClientSendMessage);

clientRouter.post("/enviar", requireClient, handleClientSendMessage);

clientRouter.get("/:agendamentoId", requireClient, async (req, res) => {
  try {
    const agendamentoId = parseInt(req.params.agendamentoId);
    if (isNaN(agendamentoId)) return res.status(400).json({ error: "ID inválido" });

    const clienteUser = (req as any).clienteUser;

    const [agend] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, agendamentoId)).limit(1);
    if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

    const [clienteRecord] = await db.select().from(clientesTable).where(
      eq(clientesTable.id, agend.clienteId)
    ).limit(1);
    if (!clienteRecord || clienteRecord.email !== clienteUser.email) {
      return res.status(403).json({ error: "Agendamento não pertence a este cliente" });
    }

    const mensagens = await db.select().from(mensagensAgendamentoTable).where(
      eq(mensagensAgendamentoTable.agendamentoId, agendamentoId)
    ).orderBy(mensagensAgendamentoTable.createdAt);

    return res.json(mensagens);
  } catch (e) {
    console.error("agendamento-mensagens thread GET error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

const staffRouter: IRouter = Router({ mergeParams: true });

staffRouter.get("/inbox", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const allMensagens = await db.select().from(mensagensAgendamentoTable).where(
      eq(mensagensAgendamentoTable.barbeariaId, barbeariaId)
    ).orderBy(mensagensAgendamentoTable.createdAt);

    const threadsByAgendamento: Record<number, typeof allMensagens> = {};
    for (const m of allMensagens) {
      if (!threadsByAgendamento[m.agendamentoId]) threadsByAgendamento[m.agendamentoId] = [];
      threadsByAgendamento[m.agendamentoId].push(m);
    }

    const unansweredLastMessages: typeof allMensagens = [];
    for (const [, msgs] of Object.entries(threadsByAgendamento)) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.remetente === "cliente") {
        unansweredLastMessages.push(lastMsg);
      }
    }

    unansweredLastMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const enriched = await Promise.all(unansweredLastMessages.map(async (m) => {
      const [agend] = await db.select().from(agendamentosTable).where(eq(agendamentosTable.id, m.agendamentoId)).limit(1);
      const [cliente] = await db.select({ nome: clienteUsersTable.nome, email: clienteUsersTable.email })
        .from(clienteUsersTable).where(eq(clienteUsersTable.id, m.clienteUserId)).limit(1);
      return { ...m, agendamento: agend || null, clienteUser: cliente || null };
    }));

    return res.json(enriched);
  } catch (e) {
    console.error("agendamento-mensagens inbox error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

staffRouter.get("/inbox/count", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const allMensagens = await db.select().from(mensagensAgendamentoTable).where(
      eq(mensagensAgendamentoTable.barbeariaId, barbeariaId)
    ).orderBy(mensagensAgendamentoTable.createdAt);

    const threadsByAgendamento: Record<number, typeof allMensagens> = {};
    for (const m of allMensagens) {
      if (!threadsByAgendamento[m.agendamentoId]) threadsByAgendamento[m.agendamentoId] = [];
      threadsByAgendamento[m.agendamentoId].push(m);
    }

    let unansweredCount = 0;
    for (const [, msgs] of Object.entries(threadsByAgendamento)) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.remetente === "cliente") unansweredCount++;
    }

    return res.json({ count: unansweredCount });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno" });
  }
});

staffRouter.get("/:agendamentoId", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const agendamentoId = parseInt(req.params.agendamentoId);
    if (isNaN(agendamentoId)) return res.status(400).json({ error: "ID inválido" });

    const [agend] = await db.select().from(agendamentosTable).where(
      and(eq(agendamentosTable.id, agendamentoId), eq(agendamentosTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

    const mensagens = await db.select().from(mensagensAgendamentoTable).where(
      eq(mensagensAgendamentoTable.agendamentoId, agendamentoId)
    ).orderBy(mensagensAgendamentoTable.createdAt);

    return res.json(mensagens);
  } catch (e) {
    console.error("agendamento-mensagens staff GET error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

staffRouter.post("/:id/responder", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const params = await getParametros(barbeariaId);
    if (params["notif_cliente_mensagem"] !== "Sim") {
      return res.status(403).json({ error: "Mensagens de agendamento estão desativadas" });
    }

    const [original] = await db.select().from(mensagensAgendamentoTable).where(
      and(eq(mensagensAgendamentoTable.id, id), eq(mensagensAgendamentoTable.barbeariaId, barbeariaId))
    ).limit(1);
    if (!original) return res.status(404).json({ error: "Mensagem não encontrada" });

    const { mensagem } = req.body;
    if (!mensagem) return res.status(400).json({ error: "mensagem é obrigatória" });

    await db.update(mensagensAgendamentoTable).set({ lida: true }).where(eq(mensagensAgendamentoTable.id, id));

    const [resposta] = await db.insert(mensagensAgendamentoTable).values({
      agendamentoId: original.agendamentoId,
      clienteUserId: original.clienteUserId,
      barbeariaId,
      remetente: "estabelecimento",
      mensagem: mensagem.trim(),
      lida: false,
    }).returning();

    const [barbearia] = await db.select({ nome: barbeariasTable.nome, slug: barbeariasTable.slug }).from(barbeariasTable)
      .where(eq(barbeariasTable.id, barbeariaId)).limit(1);
    const barbNome = barbearia?.nome || "Estabelecimento";
    const barbSlug = barbearia?.slug || "";

    sendPushToCliente(
      original.clienteUserId,
      barbeariaId,
      `Mensagem de ${barbNome}`,
      mensagem.trim(),
      {
        agendamentoId: original.agendamentoId,
        type: "agendamento_mensagem",
        slug: barbSlug,
        url: barbSlug ? `/${barbSlug}?mensagem=1&agendamentoId=${original.agendamentoId}` : `/agendamentos/${original.agendamentoId}`,
      }
    ).catch(err => console.error("[Push] Error sending reply push:", err));

    return res.status(201).json(resposta);
  } catch (e) {
    console.error("agendamento-mensagens responder error:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

staffRouter.post("/:id/marcar-lida", requireAuth, async (req, res) => {
  try {
    const barbeariaId = await checkAccess(req, res);
    if (!barbeariaId) return;

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    await db.update(mensagensAgendamentoTable).set({ lida: true }).where(
      and(eq(mensagensAgendamentoTable.id, id), eq(mensagensAgendamentoTable.barbeariaId, barbeariaId))
    );

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno" });
  }
});

export { clientRouter, staffRouter };
export default staffRouter;
