import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
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
router.use("/public", publicRouter);

export default router;
