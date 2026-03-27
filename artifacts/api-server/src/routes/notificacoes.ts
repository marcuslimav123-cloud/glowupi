import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { clientesTable, mensagensTable, solicitacoesCadastroTable, usersTable, pacotesClienteTable, pacotesTable, barbeariasTable, agendamentosTable } from "@workspace/db/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";
import { sendEmail } from "../lib/brevo.js";

const router: IRouter = Router({ mergeParams: true });

router.get("/config", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  return res.json({
    notif_mensagem_agendar_cancelar: params["notif_mensagem_agendar_cancelar"] || "Habilitado",
    notif_nao_enviar_confirmacao: params["notif_nao_enviar_confirmacao"] || "Não",
    notif_tempo_lembrete: params["notif_tempo_lembrete"] || "24",
    notif_lembrete_sms: params["notif_lembrete_sms"] || "Não",
    notif_lembrete_whatsapp: params["notif_lembrete_whatsapp"] || "Não",
    notif_link_confirmacao: params["notif_link_confirmacao"] || "Sim",
    notif_mensagem_gestores: params["notif_mensagem_gestores"] || "Habilitado",
    notif_aniversario_app: params["notif_aniversario_app"] || "Não",
    notif_aniversario_email: params["notif_aniversario_email"] || "Não",
    notif_aniversario_sms: params["notif_aniversario_sms"] || "Não",
    notif_aniversario_whatsapp: params["notif_aniversario_whatsapp"] || "Não",
    notif_retorno_sms: params["notif_retorno_sms"] || "Não",
    notif_retorno_whatsapp: params["notif_retorno_whatsapp"] || "Não",
    notif_avaliacao_whatsapp: params["notif_avaliacao_whatsapp"] || "Não",
    notif_pacote_expirando: params["notif_pacote_expirando"] || "Sim",
    fidelidade_desativar: params["fidelidade_desativar"] || "Não",
    fidelidade_expiracao_pontos: params["fidelidade_expiracao_pontos"] || "365",
    fidelidade_pontos_app_site: params["fidelidade_pontos_app_site"] || "Não",
  });
});

router.get("/aniversariantes", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
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

  const canais = {
    app: params["notif_aniversario_app"] === "Sim",
    email: params["notif_aniversario_email"] === "Sim",
    sms: params["notif_aniversario_sms"] === "Sim",
    whatsapp: params["notif_aniversario_whatsapp"] === "Sim",
  };

  return res.json({
    hoje: aniversariantes.map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone, aniversario: c.aniversario })),
    semana: proximos7dias.map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone, aniversario: c.aniversario })),
    canais,
  });
});

router.get("/mensagens", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const mensagens = await db.select().from(mensagensTable)
    .where(eq(mensagensTable.barbeariaId, barbeariaId))
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

router.get("/pacotes-expirando", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  if ((params["notif_pacote_expirando"] || "Sim") !== "Sim") {
    return res.json([]);
  }
  const ativos = await db.select().from(pacotesClienteTable).where(
    and(eq(pacotesClienteTable.barbeariaId, barbeariaId), eq(pacotesClienteTable.status, "ativo"))
  );
  const hoje = new Date();
  const diasAlerta = 7;
  const expirando = ativos.filter(pc => {
    if (!pc.dataValidade) return false;
    const validade = new Date(pc.dataValidade);
    const diffDias = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias >= 0 && diffDias <= diasAlerta;
  });
  const pacotes = await db.select().from(pacotesTable).where(eq(pacotesTable.barbeariaId, barbeariaId));
  const pacoteMap = Object.fromEntries(pacotes.map(p => [p.id, p.nome]));
  return res.json(expirando.map(pc => ({
    id: pc.id,
    clienteNome: pc.clienteNome,
    clienteId: pc.clienteId,
    pacoteNome: pacoteMap[pc.pacoteId] || "",
    dataValidade: pc.dataValidade?.toISOString?.() ?? pc.dataValidade,
    sessoesUsadas: pc.sessoesUsadas,
    sessoesTotal: pc.sessoesTotal,
  })));
});

router.post("/pacotes-expirando/enviar", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  if ((params["notif_pacote_expirando"] || "Sim") !== "Sim") {
    return res.status(400).json({ error: "Notificação de pacote expirando está desabilitada" });
  }
  const { pacoteClienteId } = req.body;
  if (!pacoteClienteId) return res.status(400).json({ error: "pacoteClienteId é obrigatório" });

  const [pc] = await db.select().from(pacotesClienteTable).where(
    and(eq(pacotesClienteTable.id, pacoteClienteId), eq(pacotesClienteTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!pc) return res.status(404).json({ error: "Pacote do cliente não encontrado" });

  if (pc.clienteId) {
    const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, pc.clienteId)).limit(1);
    const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
    const nomeEstab = barb?.nome || "Glow Up";
    const pacotes = await db.select().from(pacotesTable).where(eq(pacotesTable.id, pc.pacoteId));
    const pacoteNome = pacotes[0]?.nome || "Pacote";
    if (cliente?.email) {
      await sendEmail({
        to: [{ email: cliente.email, name: pc.clienteNome }],
        subject: `${nomeEstab} — Seu pacote está expirando`,
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>Olá, ${pc.clienteNome}! Seu pacote <strong>${pacoteNome}</strong> está prestes a expirar em ${pc.dataValidade ? new Date(pc.dataValidade).toLocaleDateString("pt-BR") : "breve"}.</p><p>Sessões usadas: ${pc.sessoesUsadas}/${pc.sessoesTotal}. Agende suas sessões restantes!</p></div>`,
      });
      return res.json({ success: true, canal: "email", enviado: true });
    }
  }
  return res.json({ success: true, canal: "email", enviado: false, message: "Cliente sem email cadastrado" });
});

router.post("/aniversario/enviar", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  const { clienteId, canal } = req.body;
  if (!clienteId || !canal) return res.status(400).json({ error: "clienteId e canal são obrigatórios" });

  const [cliente] = await db.select().from(clientesTable).where(
    and(eq(clientesTable.id, clienteId), eq(clientesTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

  const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  const nomeEstab = barb?.nome || "Glow Up";

  if (canal === "email") {
    if (params["notif_aniversario_email"] !== "Sim") {
      return res.status(400).json({ error: "Envio de aniversário por email está desabilitado" });
    }
    if (!cliente.email) return res.status(400).json({ error: "Cliente não possui email cadastrado" });
    await sendEmail({
      to: [{ email: cliente.email, name: cliente.nome }],
      subject: `${nomeEstab} — Feliz Aniversário! 🎂`,
      htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>Feliz aniversário, <strong>${cliente.nome}</strong>! Desejamos a você um dia maravilhoso.</p></div>`,
    });
    return res.json({ success: true, canal: "email" });
  }

  if (canal === "sms") {
    if (params["notif_aniversario_sms"] !== "Sim") {
      return res.status(400).json({ error: "Envio de aniversário por SMS está desabilitado" });
    }
    return res.json({ success: true, canal: "sms", message: "SMS preparado (serviço externo não configurado)" });
  }

  if (canal === "whatsapp") {
    if (params["notif_aniversario_whatsapp"] !== "Sim") {
      return res.status(400).json({ error: "Envio de aniversário por WhatsApp está desabilitado" });
    }
    return res.json({ success: true, canal: "whatsapp", message: "WhatsApp preparado (serviço externo não configurado)" });
  }

  if (canal === "app") {
    if (params["notif_aniversario_app"] !== "Sim") {
      return res.status(400).json({ error: "Notificação de aniversário no app está desabilitada" });
    }
    return res.json({ success: true, canal: "app", message: "Notificação registrada" });
  }

  return res.status(400).json({ error: "Canal inválido. Use: email, sms, whatsapp ou app" });
});

router.post("/retorno/enviar", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  const { clienteId, canal } = req.body;
  if (!clienteId || !canal) return res.status(400).json({ error: "clienteId e canal são obrigatórios" });

  if (canal === "sms") {
    if (params["notif_retorno_sms"] !== "Sim") {
      return res.status(400).json({ error: "Envio de retorno por SMS está desabilitado" });
    }
    return res.json({ success: true, canal: "sms", message: "SMS de retorno preparado (serviço externo não configurado)" });
  }

  if (canal === "whatsapp") {
    if (params["notif_retorno_whatsapp"] !== "Sim") {
      return res.status(400).json({ error: "Envio de retorno por WhatsApp está desabilitado" });
    }
    return res.json({ success: true, canal: "whatsapp", message: "WhatsApp de retorno preparado (serviço externo não configurado)" });
  }

  return res.status(400).json({ error: "Canal inválido para retorno. Use: sms ou whatsapp" });
});

router.get("/lembretes", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  const tempoLembreteHoras = parseInt(params["notif_tempo_lembrete"] || "24");
  const incluirLink = (params["notif_link_confirmacao"] || "Sim") === "Sim";
  const usaSms = params["notif_lembrete_sms"] === "Sim";
  const usaWhatsapp = params["notif_lembrete_whatsapp"] === "Sim";

  const agora = new Date();
  const limiteHoras = new Date(agora.getTime() + tempoLembreteHoras * 60 * 60 * 1000);
  const dataHoje = agora.toISOString().slice(0, 10);
  const dataLimite = limiteHoras.toISOString().slice(0, 10);

  const agendamentos = await db.select().from(agendamentosTable).where(
    and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      eq(agendamentosTable.status, "confirmado"),
      gte(agendamentosTable.data, dataHoje),
      lte(agendamentosTable.data, dataLimite)
    )
  );

  const lembretesPendentes = agendamentos.filter(a => {
    const agendDate = new Date(a.data + "T" + a.horaInicio + ":00");
    const diffMs = agendDate.getTime() - agora.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);
    return diffHoras > 0 && diffHoras <= tempoLembreteHoras;
  });

  return res.json({
    tempoLembreteHoras,
    incluirLinkConfirmacao: incluirLink,
    canais: { email: true, sms: usaSms, whatsapp: usaWhatsapp },
    lembretes: lembretesPendentes.map(a => ({
      agendamentoId: a.id,
      clienteNome: a.clienteNome,
      clienteTelefone: a.clienteTelefone,
      clienteId: a.clienteId,
      profissionalNome: a.profissionalNome,
      servicoNome: a.servicoNome,
      data: a.data,
      horaInicio: a.horaInicio,
    })),
  });
});

router.post("/lembretes/enviar", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const params = await getParametros(barbeariaId);
  const { agendamentoId } = req.body;
  if (!agendamentoId) return res.status(400).json({ error: "agendamentoId é obrigatório" });

  const [agend] = await db.select().from(agendamentosTable).where(
    and(eq(agendamentosTable.id, agendamentoId), eq(agendamentosTable.barbeariaId, barbeariaId))
  ).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

  const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
  const nomeEstab = barb?.nome || "Glow Up";
  const incluirLink = (params["notif_link_confirmacao"] || "Sim") === "Sim";
  const usaSms = params["notif_lembrete_sms"] === "Sim";
  const usaWhatsapp = params["notif_lembrete_whatsapp"] === "Sim";
  const resultados: { canal: string; status: string }[] = [];

  if (agend.clienteId) {
    const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, agend.clienteId)).limit(1);
    if (cliente?.email) {
      const domain = process.env.REPLIT_DEV_DOMAIN || "glowup.app";
      let linkHtml = "";
      if (incluirLink) {
        const confirmUrl = `https://${domain}/confirmar/${agend.id}`;
        linkHtml = `<p style="margin-top:16px;text-align:center;"><a href="${confirmUrl}" style="display:inline-block;padding:10px 24px;background:#c4a46a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar Presença</a></p>`;
      }
      await sendEmail({
        to: [{ email: cliente.email, name: agend.clienteNome }],
        subject: `${nomeEstab} — Lembrete de Agendamento`,
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.06);"><h2 style="color:#1a1a1a;">${nomeEstab}</h2><p>Olá, ${agend.clienteNome}! Lembramos que você tem um agendamento de <strong>${agend.servicoNome}</strong> com <strong>${agend.profissionalNome}</strong> em ${agend.data} às ${agend.horaInicio}.</p>${linkHtml}</div>`,
      });
      resultados.push({ canal: "email", status: "enviado" });
    }
  }

  if (usaSms && agend.clienteTelefone) {
    resultados.push({ canal: "sms", status: "preparado" });
  }
  if (usaWhatsapp && agend.clienteTelefone) {
    resultados.push({ canal: "whatsapp", status: "preparado" });
  }

  return res.json({ success: true, agendamentoId: agend.id, resultados });
});

export default router;
