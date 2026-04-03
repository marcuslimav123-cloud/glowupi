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
import avaliacoesRouter from "./avaliacoes.js";
import listaEsperaRouter from "./listaEspera.js";
import recompensasRouter from "./recompensas.js";
import resgatesRouter from "./resgates.js";
import movimentacoesEstoqueRouter from "./movimentacoesEstoque.js";
import mensagensRouter from "./mensagens.js";
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
import filiaisRouter from "./filiais.js";

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
router.use("/barbearias/:barbeariaId/avaliacoes", avaliacoesRouter);
router.use("/barbearias/:barbeariaId/lista-espera", listaEsperaRouter);
router.use("/barbearias/:barbeariaId/recompensas", recompensasRouter);
router.use("/barbearias/:barbeariaId/resgates", resgatesRouter);
router.use("/barbearias/:barbeariaId/produtos/:produtoId/movimentacoes", movimentacoesEstoqueRouter);
router.use("/barbearias/:barbeariaId/mensagens", mensagensRouter);
router.use("/checkout", checkoutRouter);
router.use("/public", publicRouter);
router.use("/convites", convitesRouter);
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
