import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  emailCampaignsTable, emailCampaignRecipientsTable,
  barbeariasTable, clientesTable, usersTable,
} from "@workspace/db/schema";
import { and, eq, desc, inArray, sql, gte } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import {
  sendMarketingEmail, generateUnsubscribeToken, buildUnsubscribeUrl,
  buildAgendamentoUrl, renderMarketingBody, isValidEmail,
} from "../lib/marketingEmail.js";
import { checkQuota, incrementQuota, getQuotaSummary, reserveQuota } from "../lib/emailQuota.js";

const router: IRouter = Router({ mergeParams: true });

const SEND_DELAY_MS = 500;

router.get("/config", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  if (!barb) return res.status(404).json({ error: "Estabelecimento não encontrado" });
  const quota = await getQuotaSummary(barbeariaId);
  return res.json({
    ativado: barb.emailMarketingAtivado || false,
    quota,
  });
});

router.patch("/config", requireAuth, requireRole("dono"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { ativado } = req.body;
  if (typeof ativado !== "boolean") return res.status(400).json({ error: "Campo 'ativado' obrigatório (boolean)" });
  await db.update(barbeariasTable).set({ emailMarketingAtivado: ativado, updatedAt: new Date() }).where(eq(barbeariasTable.id, barbeariaId));
  return res.json({ success: true, ativado });
});

router.get("/recipients-preview", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const filtro = (req.query.filtro as string) || "todos";
  const search = (req.query.search as string) || "";

  const all = await db.select().from(clientesTable).where(
    and(
      eq(clientesTable.barbeariaId, barbeariaId),
      eq(clientesTable.emailMarketingOptout, false),
    )
  );

  let filtered = all.filter(c => !!c.email && isValidEmail(c.email));

  if (filtro === "ativos_90") {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(c => c.ultimaVisita && new Date(c.ultimaVisita) >= cutoff);
  } else if (filtro === "aniversariantes_mes") {
    const mes = new Date().getMonth() + 1;
    filtered = filtered.filter(c => {
      if (!c.aniversario) return false;
      const m = parseInt(c.aniversario.slice(5, 7));
      return m === mes;
    });
  } else if (filtro.startsWith("inativos_")) {
    const dias = parseInt(filtro.replace("inativos_", "")) || 60;
    const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(c => !c.ultimaVisita || new Date(c.ultimaVisita) < cutoff);
  }

  if (search.trim()) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c => c.nome.toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s));
  }

  return res.json({
    total: filtered.length,
    items: filtered.map(c => ({ id: c.id, nome: c.nome, email: c.email, ultimaVisita: c.ultimaVisita, aniversario: c.aniversario })).slice(0, 1000),
  });
});

router.get("/campanhas", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const list = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.barbeariaId, barbeariaId)).orderBy(desc(emailCampaignsTable.criadaEm));
  return res.json(list.map(c => ({
    ...c,
    criadaEm: c.criadaEm?.toISOString(),
    enviadaEm: c.enviadaEm?.toISOString() ?? null,
    finalizadaEm: c.finalizadaEm?.toISOString() ?? null,
  })));
});

router.post("/campanhas", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const { assunto, corpo, filtros } = req.body;
  if (!assunto || !corpo) return res.status(400).json({ error: "Assunto e corpo obrigatórios" });
  const [c] = await db.insert(emailCampaignsTable).values({
    barbeariaId,
    autorUserId: user.id,
    assunto,
    corpo,
    filtros: filtros ?? null,
    status: "rascunho",
  }).returning();
  return res.status(201).json(c);
});

router.get("/campanhas/:id", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const [c] = await db.select().from(emailCampaignsTable).where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.barbeariaId, barbeariaId))).limit(1);
  if (!c) return res.status(404).json({ error: "Campanha não encontrada" });
  const recipients = await db.select().from(emailCampaignRecipientsTable).where(eq(emailCampaignRecipientsTable.campaignId, id));
  return res.json({
    ...c,
    criadaEm: c.criadaEm?.toISOString(),
    enviadaEm: c.enviadaEm?.toISOString() ?? null,
    finalizadaEm: c.finalizadaEm?.toISOString() ?? null,
    recipients: recipients.map(r => ({
      ...r,
      enviadoEm: r.enviadoEm?.toISOString() ?? null,
      entregueEm: r.entregueEm?.toISOString() ?? null,
      abertoEm: r.abertoEm?.toISOString() ?? null,
    })),
  });
});

router.post("/campanhas/:id/enviar-teste", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.id);
  const [c] = await db.select().from(emailCampaignsTable).where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.barbeariaId, barbeariaId))).limit(1);
  if (!c) return res.status(404).json({ error: "Campanha não encontrada" });
  const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  if (!barb) return res.status(404).json({ error: "Estabelecimento não encontrado" });
  if (!user.email || !isValidEmail(user.email)) return res.status(400).json({ error: "Seu usuário não tem e-mail válido" });

  const fakeToken = "teste-" + Date.now();
  const vars = {
    nome_cliente: user.nome || "Você",
    nome_estabelecimento: barb.nome,
    link_agendamento: buildAgendamentoUrl(barb.slug),
    link_descadastrar: buildUnsubscribeUrl(fakeToken),
  };
  const body = renderMarketingBody(c.corpo, vars);
  const subject = "[TESTE] " + (c.assunto.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => (vars as any)[k] || ""));
  const result = await sendMarketingEmail({
    to: { email: user.email, name: user.nome || undefined },
    assunto: subject,
    bodyHtml: body,
    nomeEstabelecimento: barb.nome,
    unsubscribeUrl: vars.link_descadastrar,
  });
  if (!result.success) return res.status(500).json({ error: result.error || "Falha ao enviar teste" });
  return res.json({ success: true, sentTo: user.email });
});

router.post("/campanhas/:id/enviar", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.id);
  const { clienteIds } = req.body;
  if (!Array.isArray(clienteIds) || clienteIds.length === 0) return res.status(400).json({ error: "Selecione ao menos 1 destinatário" });

  const [c] = await db.select().from(emailCampaignsTable).where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.barbeariaId, barbeariaId))).limit(1);
  if (!c) return res.status(404).json({ error: "Campanha não encontrada" });
  if (c.status === "enviando" || c.status === "concluida") {
    return res.status(409).json({ error: `Campanha já ${c.status === "enviando" ? "está sendo enviada" : "foi enviada"}` });
  }

  const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  if (!barb) return res.status(404).json({ error: "Estabelecimento não encontrado" });
  if (!barb.emailMarketingAtivado) return res.status(403).json({ error: "Ative o E-mail Marketing primeiro" });

  const clientes = await db.select().from(clientesTable).where(
    and(
      eq(clientesTable.barbeariaId, barbeariaId),
      inArray(clientesTable.id, clienteIds),
      eq(clientesTable.emailMarketingOptout, false),
    )
  );
  const validos = clientes.filter(cl => cl.email && isValidEmail(cl.email));
  if (validos.length === 0) return res.status(400).json({ error: "Nenhum destinatário válido (sem e-mail ou descadastrados)" });

  const reservation = await reserveQuota(barbeariaId, "massa", validos.length);
  if (!reservation.ok) {
    return res.status(429).json({
      error: `Você atingiu o limite de ${reservation.limite} e-mails de campanha hoje (usado: ${reservation.usado}). Reseta à meia-noite (horário de Brasília).`,
      restante: Math.max(0, reservation.limite - reservation.usado),
    });
  }

  const recipientsRows = validos.map(cl => ({
    campaignId: id,
    barbeariaId,
    clienteId: cl.id,
    email: cl.email!,
    nome: cl.nome,
    status: "pendente" as const,
    unsubscribeToken: generateUnsubscribeToken(),
  }));
  await db.insert(emailCampaignRecipientsTable).values(recipientsRows);

  await db.update(emailCampaignsTable).set({
    status: "enviando",
    totalDestinatarios: validos.length,
    enviadaEm: new Date(),
  }).where(eq(emailCampaignsTable.id, id));

  processCampaign(id, barbeariaId, barb.nome, barb.slug, c.assunto, c.corpo).catch(err => {
    console.error(`[EmailMarketing] Worker falhou para campanha ${id}:`, err);
  });

  return res.status(202).json({ success: true, total: validos.length, message: "Envio iniciado" });
});

async function processCampaign(campaignId: number, barbeariaId: number, nomeEstab: string, slug: string | null, assunto: string, corpo: string) {
  const recipients = await db.select().from(emailCampaignRecipientsTable).where(
    and(eq(emailCampaignRecipientsTable.campaignId, campaignId), eq(emailCampaignRecipientsTable.status, "pendente"))
  );
  let enviados = 0;
  let falhas = 0;
  for (const r of recipients) {
    let optoutToken = r.unsubscribeToken;
    if (r.clienteId) {
      const [cl] = await db.select({ token: clientesTable.emailMarketingOptoutToken })
        .from(clientesTable).where(eq(clientesTable.id, r.clienteId)).limit(1);
      if (cl?.token) {
        optoutToken = cl.token;
      } else {
        optoutToken = optoutToken || generateUnsubscribeToken();
        await db.update(clientesTable)
          .set({ emailMarketingOptoutToken: optoutToken })
          .where(eq(clientesTable.id, r.clienteId));
      }
    } else {
      optoutToken = optoutToken || generateUnsubscribeToken();
    }
    const vars = {
      nome_cliente: r.nome || "Cliente",
      nome_estabelecimento: nomeEstab,
      link_agendamento: buildAgendamentoUrl(slug),
      link_descadastrar: buildUnsubscribeUrl(optoutToken),
    };
    const body = renderMarketingBody(corpo, vars);
    const subject = assunto.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => (vars as any)[k] || "");

    try {
      const result = await sendMarketingEmail({
        to: { email: r.email, name: r.nome || undefined },
        assunto: subject,
        bodyHtml: body,
        nomeEstabelecimento: nomeEstab,
        unsubscribeUrl: vars.link_descadastrar,
      });
      if (result.success) {
        await db.update(emailCampaignRecipientsTable).set({
          status: "enviado",
          brevoMessageId: result.messageId || null,
          unsubscribeToken: optoutToken,
          enviadoEm: new Date(),
        }).where(eq(emailCampaignRecipientsTable.id, r.id));
        enviados++;
      } else {
        await db.update(emailCampaignRecipientsTable).set({
          status: "falha",
          erro: result.error || "Erro desconhecido",
        }).where(eq(emailCampaignRecipientsTable.id, r.id));
        await incrementQuota(barbeariaId, "massa", -1);
        falhas++;
      }
    } catch (err: any) {
      await db.update(emailCampaignRecipientsTable).set({
        status: "falha",
        erro: err?.message || String(err),
      }).where(eq(emailCampaignRecipientsTable.id, r.id));
      await incrementQuota(barbeariaId, "massa", -1);
      falhas++;
    }
    await new Promise(resolve => setTimeout(resolve, SEND_DELAY_MS));
  }

  await db.update(emailCampaignsTable).set({
    status: "concluida",
    totalEnviados: enviados,
    totalFalhas: falhas,
    finalizadaEm: new Date(),
  }).where(eq(emailCampaignsTable.id, campaignId));
  console.log(`[EmailMarketing] Campanha ${campaignId} concluída: ${enviados} enviados, ${falhas} falhas`);
}

router.post("/individual", requireAuth, requireRole("dono", "gerente"), async (req: any, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, assunto, corpo } = req.body;
  if (!clienteId || !assunto || !corpo) return res.status(400).json({ error: "clienteId, assunto e corpo obrigatórios" });

  const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  if (!barb) return res.status(404).json({ error: "Estabelecimento não encontrado" });
  if (!barb.emailMarketingAtivado) return res.status(403).json({ error: "Ative o E-mail Marketing primeiro" });

  const [cl] = await db.select().from(clientesTable).where(and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId))).limit(1);
  if (!cl) return res.status(404).json({ error: "Cliente não encontrado" });
  if (cl.emailMarketingOptout) return res.status(403).json({ error: "Cliente descadastrou e não pode receber e-mails" });
  if (!cl.email || !isValidEmail(cl.email)) return res.status(400).json({ error: "Cliente sem e-mail válido" });

  const reservation = await reserveQuota(barbeariaId, "manual", 1);
  if (!reservation.ok) {
    return res.status(429).json({
      error: `Você atingiu o limite de ${reservation.limite} e-mails individuais hoje. Reseta à meia-noite (horário de Brasília).`,
      restante: 0,
    });
  }

  const optoutToken = cl.emailMarketingOptoutToken || generateUnsubscribeToken();
  if (!cl.emailMarketingOptoutToken) {
    await db.update(clientesTable).set({ emailMarketingOptoutToken: optoutToken }).where(eq(clientesTable.id, cl.id));
  }

  const vars = {
    nome_cliente: cl.nome || "Cliente",
    nome_estabelecimento: barb.nome,
    link_agendamento: buildAgendamentoUrl(barb.slug),
    link_descadastrar: buildUnsubscribeUrl(optoutToken),
  };
  const body = renderMarketingBody(corpo, vars);
  const subject = assunto.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => (vars as any)[k] || "");

  const result = await sendMarketingEmail({
    to: { email: cl.email, name: cl.nome || undefined },
    assunto: subject,
    bodyHtml: body,
    nomeEstabelecimento: barb.nome,
    unsubscribeUrl: vars.link_descadastrar,
  });
  if (!result.success) {
    await incrementQuota(barbeariaId, "manual", -1);
    return res.status(500).json({ error: result.error || "Falha ao enviar" });
  }
  return res.json({ success: true, sentTo: cl.email, restante: (await getQuotaSummary(barbeariaId)).manual.restante });
});

const publicRouter: IRouter = Router();

async function handleOptout(req: any, res: any) {
  try {
    const token = req.params.token;
    if (!token || token.length < 8) {
      return res.status(400).send(unsubPage("Link inválido", "O link de descadastro é inválido."));
    }
    const [cl] = await db.select().from(clientesTable).where(eq(clientesTable.emailMarketingOptoutToken, token)).limit(1);
    if (!cl) {
      return res.status(404).send(unsubPage("Link não encontrado", "Este link de descadastro não foi encontrado ou já foi usado."));
    }
    if (!cl.emailMarketingOptout) {
      await db.update(clientesTable).set({
        emailMarketingOptout: true,
        emailMarketingOptoutAt: new Date(),
      }).where(eq(clientesTable.id, cl.id));
    }
    const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, cl.barbeariaId)).limit(1);
    return res.send(unsubPage("Você foi descadastrado", `Você não receberá mais e-mails de campanha de <strong>${escapeHtml(barb?.nome || "este estabelecimento")}</strong>. Mensagens transacionais (confirmações, lembretes) continuam normalmente.`));
  } catch (err) {
    console.error("[EmailMarketing] unsubscribe error:", err);
    return res.status(500).send(unsubPage("Erro", "Ocorreu um erro ao processar seu pedido."));
  }
}

publicRouter.get("/unsubscribe/:token", handleOptout);
publicRouter.get("/optout/:token", handleOptout);

publicRouter.post("/optout/:token", async (req, res) => {
  try {
    const token = req.params.token;
    if (!token || token.length < 8) return res.status(400).json({ ok: false, error: "Token inválido" });
    const [cl] = await db.select().from(clientesTable).where(eq(clientesTable.emailMarketingOptoutToken, token)).limit(1);
    if (!cl) return res.status(404).json({ ok: false, error: "Link não encontrado" });
    if (!cl.emailMarketingOptout) {
      await db.update(clientesTable).set({
        emailMarketingOptout: true,
        emailMarketingOptoutAt: new Date(),
      }).where(eq(clientesTable.id, cl.id));
    }
    const [barb] = await db.select({ nome: barbeariasTable.nome }).from(barbeariasTable).where(eq(barbeariasTable.id, cl.barbeariaId)).limit(1);
    return res.json({ ok: true, nomeEstabelecimento: barb?.nome || "" });
  } catch (err: any) {
    console.error("[EmailMarketing] optout JSON error:", err);
    return res.status(500).json({ ok: false, error: "Erro ao processar pedido" });
  }
});

publicRouter.post("/brevo-webhook", async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const ev of events) {
      const messageId = ev["message-id"] || ev.messageId;
      const event = ev.event;
      if (!messageId || !event) continue;
      const [r] = await db.select().from(emailCampaignRecipientsTable).where(eq(emailCampaignRecipientsTable.brevoMessageId, messageId)).limit(1);
      if (!r) continue;
      const updates: any = {};
      if (event === "delivered") {
        updates.status = "entregue";
        updates.entregueEm = new Date();
      } else if (event === "opened" || event === "unique_opened") {
        if (!r.abertoEm) {
          updates.status = "aberto";
          updates.abertoEm = new Date();
        }
      } else if (["hard_bounce", "soft_bounce", "blocked", "spam", "invalid_email", "deferred", "unsubscribed", "error"].includes(event)) {
        updates.status = "falha";
        updates.erro = event;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(emailCampaignRecipientsTable).set(updates).where(eq(emailCampaignRecipientsTable.id, r.id));
        if (updates.status === "entregue") {
          await db.update(emailCampaignsTable).set({ totalEntregues: sql`${emailCampaignsTable.totalEntregues} + 1` }).where(eq(emailCampaignsTable.id, r.campaignId));
        } else if (updates.status === "aberto") {
          await db.update(emailCampaignsTable).set({ totalAbertos: sql`${emailCampaignsTable.totalAbertos} + 1` }).where(eq(emailCampaignsTable.id, r.campaignId));
        }
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[EmailMarketing] brevo-webhook error:", err);
    return res.status(200).json({ ok: false });
  }
});

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

function unsubPage(titulo: string, mensagem: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo} — Glow Upi</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8f7f4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
  <div style="max-width:480px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);padding:40px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
    <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(196,164,106,0.2),rgba(196,164,106,0.08));margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:28px;">✓</div>
    <h1 style="margin:0 0 12px;font-size:22px;color:#1a1a1a;font-weight:700;">${titulo}</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(0,0,0,0.6);">${mensagem}</p>
    <p style="margin:24px 0 0;font-size:11px;color:rgba(0,0,0,0.3);">Glow Upi</p>
  </div>
</body></html>`;
}

async function resumeStuckCampaigns() {
  try {
    const stuck = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.status, "enviando"));
    for (const c of stuck) {
      const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, c.barbeariaId)).limit(1);
      if (!barb) continue;
      const pending = await db.select({ id: emailCampaignRecipientsTable.id }).from(emailCampaignRecipientsTable)
        .where(and(eq(emailCampaignRecipientsTable.campaignId, c.id), eq(emailCampaignRecipientsTable.status, "pendente")));
      if (pending.length === 0) {
        await db.update(emailCampaignsTable).set({ status: "concluida", finalizadaEm: new Date() }).where(eq(emailCampaignsTable.id, c.id));
        continue;
      }
      console.log(`[EmailMarketing] Resuming campaign #${c.id} (${pending.length} pendentes)`);
      processCampaign(c.id, c.barbeariaId, barb.nome, barb.slug, c.assunto, c.corpo).catch(err => {
        console.error(`[EmailMarketing] Resume failed for campaign ${c.id}:`, err);
      });
    }
  } catch (err) {
    console.error("[EmailMarketing] resumeStuckCampaigns error:", err);
  }
}

export function startEmailMarketingWorker() {
  resumeStuckCampaigns();
  setInterval(resumeStuckCampaigns, 5 * 60 * 1000);
  console.log("[EmailMarketing] Worker started (sweep every 5 minutes)");
}

export { publicRouter as emailMarketingPublicRouter };
export default router;
