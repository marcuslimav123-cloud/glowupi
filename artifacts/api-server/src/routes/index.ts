import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { platformConfigTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use("/auth", authRouter);
router.use("/client", clientAuthRouter);
router.use("/barbearias", barbeariasRouter);
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
