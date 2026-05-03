import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable, platformConfigTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireActiveSubscription } from "../lib/auth.js";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import barbeariasRouter from "./barbearias.js";
import profissionaisRouter from "./profissionais.js";
import servicosRouter from "./servicos.js";
import clientesRouter from "./clientes.js";
import agendamentosRouter from "./agendamentos.js";
import comandasRouter from "./comandas.js";
import produtosRouter from "./produtos.js";
import dashboardRouter from "./dashboard.js";
import relatoriosRouter from "./relatorios.js";
import slotsRouter from "./slots.js";
import publicRouter from "./public.js";
import financeiroRouter from "./financeiro.js";
import pacotesRouter from "./pacotes.js";
import pacotesClienteRouter from "./pacotesCliente.js";
import atendimentosRouter from "./atendimentos.js";
import avaliacoesRouter from "./avaliacoes.js";
import listaEsperaRouter from "./listaEspera.js";
import recompensasRouter from "./recompensas.js";
import resgatesRouter from "./resgates.js";
import movimentacoesEstoqueRouter from "./movimentacoesEstoque.js";
import mensagensRouter from "./mensagens.js";
import mensagensPadraoRouter from "./mensagensPadrao.js";
import mensagensSugeridasRouter from "./mensagensSugeridas.js";
import modoHumanoRouter from "./modoHumano.js";
import checkoutRouter from "./checkout.js";
import adminRouter from "./admin.js";
import convitesRouter from "./convites.js";
import clientAuthRouter from "./clientAuth.js";
import bloqueiosRouter from "./bloqueios.js";
import tiposRouter from "./tipos.js";
import cuponsRouter from "./cupons.js";
import noticiasRouter from "./noticias.js";
import lembretesRouter from "./lembretes.js";
import assinaturasRouter from "./assinaturas.js";
import parametrosRouter from "./parametros.js";
import notificacoesRouter from "./notificacoes.js";
import perfisAcessoRouter from "./perfisAcesso.js";
import emailTemplatesRouter from "./emailTemplates.js";
import storageRouter from "./storage.js";
import caixaDiarioRouter from "./caixaDiario.js";
import comissoesRouter from "./comissoesRoutes.js";
import contasProfissionalRouter from "./contasProfissionalRoutes.js";
import pesquisaRouter from "./pesquisaRoutes.js";
import anamneseRouter from "./anamneseRoutes.js";
import documentosRouter from "./documentosRoutes.js";
import clubeVantagensRouter from "./clubeVantagensRoutes.js";
import fornecedoresRouter from "./fornecedoresRoutes.js";
import remuneracoesRouter from "./remuneracoesRoutes.js";
import equipamentosRouter from "./equipamentosRoutes.js";
import pushTokensRouter from "./pushTokens.js";
import clientPushTokensRouter from "./clientPushTokens.js";
import { clientRouter as agendamentoMensagensClientRouter, staffRouter as agendamentoMensagensStaffRouter } from "./agendamentoMensagens.js";
import { getVapidPublicKey, sendTestPushToUser } from "../lib/pushNotifications.js";
import filiaisRouter from "./filiais.js";
import notificacoesInternasRouter from "./notificacoesInternas.js";
import trialLinksRouter from "./trialLinks.js";
import campaignRouter from "./campaign.js";
import emailMarketingRouter, { emailMarketingPublicRouter } from "./emailMarketing.js";
import asaasContaRouter from "./asaasConta.js";
import asaasSinalRouter from "./asaasSinal.js";
import asaasComandaRouter from "./asaasComanda.js";
import asaasSaaSRouter from "./asaasSaaS.js";
import asaasPacoteRouter from "./asaasPacote.js";

const router: IRouter = Router();

async function subscriptionGuardMiddleware(req: any, res: any, next: any) {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) return next();

  const user = req.user;
  if (!user) return next();

  let barbearia;
  if (user.role === "dono") {
    [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);
  } else if (user.barbeariaId) {
    [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, user.barbeariaId)).limit(1);
  }
  if (!barbearia) return next();

  req.barbearia = barbearia;
  return requireActiveSubscription(req, res, next);
}

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/auth", authRouter);
router.use("/client", clientAuthRouter);
router.use("/barbearias", barbeariasRouter);

router.get("/push/vapid-public-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(404).json({ error: "VAPID key not configured" });
  return res.json({ publicKey: key });
});

router.post("/push/test", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });
    const result = await sendTestPushToUser(userId);
    if (result.total === 0) {
      return res.status(404).json({
        error: "Nenhuma inscrição ativa encontrada. Ative as notificações e tente novamente.",
        ...result,
      });
    }
    if (result.success === 0) {
      return res.status(500).json({
        error: "A notificação foi enviada mas o serviço de push rejeitou todas as inscrições. Recarregue o app e tente novamente — o sistema vai criar inscrições novas.",
        ...result,
      });
    }
    const parts: string[] = [];
    if (result.webTotal > 0) parts.push(`navegador: ${result.webSuccess}/${result.webTotal}`);
    if (result.expoTotal > 0) parts.push(`app mobile: ${result.expoSuccess}/${result.expoTotal}`);
    const breakdown = parts.join(" · ");
    let warning = "";
    if (result.webTotal > 0 && result.webSuccess === 0) {
      warning = " Atenção: nenhuma inscrição do navegador (PWA) recebeu — feche e reabra o app do celular pra recriar a inscrição.";
    }
    return res.json({
      message: `Enviado (${breakdown}). Verifique sua tela em alguns segundos.${warning}`,
      ...result,
    });
  } catch (err: any) {
    console.error("[Push] Test endpoint error:", err);
    return res.status(500).json({ error: "Erro ao enviar notificação de teste" });
  }
});

router.use("/barbearias/:barbeariaId", requireAuth, subscriptionGuardMiddleware);
router.use("/barbearias/:barbeariaId/profissionais", profissionaisRouter);
router.use("/barbearias/:barbeariaId/servicos", servicosRouter);
router.use("/barbearias/:barbeariaId/clientes", clientesRouter);
router.use("/barbearias/:barbeariaId/agendamentos", agendamentosRouter);
router.use("/barbearias/:barbeariaId/comandas", comandasRouter);
router.use("/barbearias/:barbeariaId/produtos", produtosRouter);
router.use("/barbearias/:barbeariaId/dashboard", dashboardRouter);
router.use("/barbearias/:barbeariaId/relatorios", relatoriosRouter);
router.use("/barbearias/:barbeariaId/slots-disponiveis", slotsRouter);
router.use("/barbearias/:barbeariaId/financeiro", financeiroRouter);
router.use("/barbearias/:barbeariaId/pacotes", pacotesRouter);
router.use("/barbearias/:barbeariaId/pacotes-cliente", pacotesClienteRouter);
router.use("/barbearias/:barbeariaId/atendimentos", atendimentosRouter);
router.use("/barbearias/:barbeariaId/avaliacoes", avaliacoesRouter);
router.use("/barbearias/:barbeariaId/lista-espera", listaEsperaRouter);
router.use("/barbearias/:barbeariaId/recompensas", recompensasRouter);
router.use("/barbearias/:barbeariaId/resgates", resgatesRouter);
router.use("/barbearias/:barbeariaId/produtos/:produtoId/movimentacoes", movimentacoesEstoqueRouter);
router.use("/barbearias/:barbeariaId/mensagens", mensagensRouter);
router.use("/barbearias/:barbeariaId/mensagens-padrao", mensagensPadraoRouter);
router.use("/barbearias/:barbeariaId/mensagens-sugeridas", mensagensSugeridasRouter);
router.use("/barbearias/:barbeariaId/modo-humano", modoHumanoRouter);
router.use("/checkout", checkoutRouter);

router.post("/support/contact", async (req, res) => {
  try {
    const { nome, email, assunto, mensagem } = req.body || {};
    if (!nome || !email || !mensagem) {
      return res.status(400).json({ error: "Nome, email e mensagem são obrigatórios" });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email))) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (String(mensagem).length > 5000 || String(nome).length > 200) {
      return res.status(400).json({ error: "Conteúdo muito longo" });
    }

    const { sendEmail } = await import("../lib/brevo.js");
    const subj = `[Suporte Glow Upi] ${assunto || "Contato pelo site"} — ${nome}`;
    const html = `
      <h3>Novo contato pelo site</h3>
      <p><strong>Nome:</strong> ${String(nome).replace(/</g, "&lt;")}</p>
      <p><strong>Email:</strong> ${String(email).replace(/</g, "&lt;")}</p>
      <p><strong>Assunto:</strong> ${String(assunto || "(sem assunto)").replace(/</g, "&lt;")}</p>
      <p><strong>Mensagem:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${String(mensagem).replace(/</g, "&lt;")}</pre>
    `;
    await sendEmail({
      to: "suporte@glowupi.com",
      subject: subj,
      html,
      replyTo: email,
    });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[support/contact] erro:", e?.message || e);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

router.use("/public", publicRouter);
router.use("/convites", convitesRouter);
router.use("/trial-link", trialLinksRouter);
router.use("/campaign", campaignRouter);
router.use("/barbearias/:barbeariaId/bloqueios", bloqueiosRouter);
router.use("/barbearias/:barbeariaId/tipos", tiposRouter);
router.use("/barbearias/:barbeariaId/cupons", cuponsRouter);
router.use("/barbearias/:barbeariaId/noticias", noticiasRouter);
router.use("/barbearias/:barbeariaId/lembretes", lembretesRouter);
router.use("/barbearias/:barbeariaId/assinaturas", assinaturasRouter);
router.use("/barbearias/:barbeariaId/parametros", parametrosRouter);
router.use("/barbearias/:barbeariaId/notificacoes", notificacoesRouter);
router.use("/barbearias/:barbeariaId/perfis-acesso", perfisAcessoRouter);
router.use("/email-templates", emailTemplatesRouter);
router.use(storageRouter);
router.use("/barbearias/:barbeariaId/caixa-diario", caixaDiarioRouter);
router.use("/barbearias/:barbeariaId/comissoes", comissoesRouter);
router.use("/barbearias/:barbeariaId/contas-profissional", contasProfissionalRouter);
router.use("/barbearias/:barbeariaId/pesquisas", pesquisaRouter);
router.use("/barbearias/:barbeariaId/anamnese", anamneseRouter);
router.use("/barbearias/:barbeariaId/documentos", documentosRouter);
router.use("/barbearias/:barbeariaId/clube-vantagens", clubeVantagensRouter);
router.use("/barbearias/:barbeariaId/fornecedores", fornecedoresRouter);
router.use("/barbearias/:barbeariaId/rh", remuneracoesRouter);
router.use("/barbearias/:barbeariaId/equipamentos", equipamentosRouter);
router.use("/barbearias/:barbeariaId/push-tokens", pushTokensRouter);
router.use("/barbearias/:barbeariaId/filiais", filiaisRouter);
router.use("/barbearias/:barbeariaId/notificacoes-internas", notificacoesInternasRouter);
router.use("/barbearias/:barbeariaId/agendamento-mensagens", agendamentoMensagensStaffRouter);
router.use("/agendamento-mensagens", agendamentoMensagensClientRouter);
router.use("/client-push-tokens", clientPushTokensRouter);
router.use("/email-marketing", emailMarketingPublicRouter);
router.use("/barbearias/:barbeariaId/email-marketing", emailMarketingRouter);
router.use("/barbearias/:barbeariaId/asaas", asaasContaRouter);
router.use("/barbearias/:barbeariaId/asaas-comanda", asaasComandaRouter);
router.use("/barbearias/:barbeariaId/asaas-pacote", asaasPacoteRouter);
router.use("/asaas-saas", asaasSaaSRouter);
router.use("/asaas-sinal", asaasSinalRouter);

router.get("/lgpd/terms", async (_req, res) => {
  try {
    const configs = await db.select().from(platformConfigTable).where(
      sql`${platformConfigTable.chave} IN ('lgpd_privacy_policy', 'lgpd_terms_of_use')`
    );
    const configMap: Record<string, string> = {};
    for (const c of configs) configMap[c.chave] = c.valor;
    return res.json({
      privacyPolicy: configMap["lgpd_privacy_policy"] || "",
      termsOfUse: configMap["lgpd_terms_of_use"] || "",
    });
  } catch {
    return res.status(500).json({ error: "Erro ao carregar termos LGPD" });
  }
});

router.get("/lgpd/google-client-id", (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  return res.json({ clientId });
});

export default router;
