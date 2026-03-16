import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  agendamentosTable, barbeariasTable, profissionaisTable,
  servicosTable, clientesTable, comandasTable, produtosTable
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router({ mergeParams: true });

async function checkAccess(req: any, res: any): Promise<number | null> {
  const barbeariaId = parseInt(req.params.barbeariaId);
  if (isNaN(barbeariaId)) { res.status(400).json({ error: "ID inválido" }); return null; }
  const [b] = await db.select().from(barbeariasTable).where(and(eq(barbeariasTable.id, barbeariaId), eq(barbeariasTable.donoId, req.user.id))).limit(1);
  if (!b) { res.status(403).json({ error: "Acesso negado" }); return null; }
  return barbeariaId;
}

function formatAgend(a: any) {
  return {
    ...a,
    valor: parseFloat(a.valor),
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    updatedAt: a.updatedAt?.toISOString?.() ?? a.updatedAt,
  };
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60).toString().padStart(2, "0");
  const nm = (total % 60).toString().padStart(2, "0");
  return `${nh}:${nm}`;
}

router.get("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { data, profissionalId, status } = req.query;
  let query = db.select().from(agendamentosTable).where(eq(agendamentosTable.barbeariaId, barbeariaId));
  const agendamentos = await db.select().from(agendamentosTable).where(
    and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      data ? eq(agendamentosTable.data, data as string) : undefined,
      profissionalId ? eq(agendamentosTable.profissionalId, parseInt(profissionalId as string)) : undefined,
      status ? eq(agendamentosTable.status, status as string) : undefined,
    )
  );
  return res.json(agendamentos.map(formatAgend));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const { clienteId, clienteNome, clienteTelefone, profissionalId, servicoId, data, horaInicio, semPreferencia, observacao } = req.body;
  if (!clienteNome || !clienteTelefone || !profissionalId || !servicoId || !data || !horaInicio) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, servicoId), eq(servicosTable.barbeariaId, barbeariaId))).limit(1);
  if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });
  const [profissional] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, profissionalId), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!profissional) return res.status(404).json({ error: "Profissional não encontrado" });
  const horaFim = addMinutesToTime(horaInicio, servico.duracaoMinutos);
  let isAniversario = false;
  if (clienteId) {
    const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, clienteId)).limit(1);
    if (cliente?.aniversario) {
      const today = data;
      const aniv = cliente.aniversario.slice(5);
      isAniversario = today.slice(5) === aniv;
    }
  }
  const [agend] = await db.insert(agendamentosTable).values({
    barbeariaId,
    clienteId: clienteId || null,
    clienteNome,
    clienteTelefone,
    profissionalId,
    profissionalNome: profissional.nomeExibicao,
    servicoId,
    servicoNome: servico.nome,
    data,
    horaInicio,
    horaFim,
    status: "confirmado",
    valor: servico.preco,
    pago: false,
    semPreferencia: semPreferencia ?? false,
    observacao: observacao || null,
    aniversario: isAniversario,
    vip: false,
  }).returning();
  return res.status(201).json(formatAgend(agend));
});

router.get("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.agendamentoId);
  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });
  return res.json(formatAgend(agend));
});

router.put("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.agendamentoId);
  const { status, profissionalId, data, horaInicio, observacao, pago } = req.body;
  const [existing] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Agendamento não encontrado" });
  const updates: any = {
    status: status ?? existing.status,
    observacao: observacao ?? existing.observacao,
    pago: pago !== undefined ? pago : existing.pago,
    updatedAt: new Date(),
  };
  if (profissionalId) {
    const [prof] = await db.select().from(profissionaisTable).where(eq(profissionaisTable.id, profissionalId)).limit(1);
    if (prof) { updates.profissionalId = profissionalId; updates.profissionalNome = prof.nomeExibicao; }
  }
  if (data) updates.data = data;
  if (horaInicio) updates.horaInicio = horaInicio;
  const [updated] = await db.update(agendamentosTable).set(updates).where(eq(agendamentosTable.id, id)).returning();
  return res.json(formatAgend(updated));
});

router.delete("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.agendamentoId);
  await db.update(agendamentosTable).set({ status: "cancelado", updatedAt: new Date() }).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Agendamento cancelado" });
});

router.post("/:agendamentoId/checkout", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const id = parseInt(req.params.agendamentoId);
  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });
  const [profissional] = await db.select().from(profissionaisTable).where(eq(profissionaisTable.id, agend.profissionalId)).limit(1);
  const { produtosAdicionais = [], pagamentos, observacao } = req.body;
  const valorServico = parseFloat(agend.valor as string);
  const comissaoPerc = profissional ? parseFloat(profissional.comissaoValor as string) : 40;
  const comissaoServico = profissional?.comissaoTipo === "valor_fixo" ? comissaoPerc : (valorServico * comissaoPerc) / 100;
  let valorProdutos = 0;
  let comissaoProdutos = 0;
  const prodItems: any[] = [];
  for (const p of produtosAdicionais) {
    const [prod] = await db.select().from(produtosTable).where(and(eq(produtosTable.id, p.produtoId), eq(produtosTable.barbeariaId, barbeariaId))).limit(1);
    if (prod) {
      valorProdutos += p.valor * p.quantidade;
      const comProd = (p.valor * p.quantidade * 10) / 100;
      comissaoProdutos += comProd;
      prodItems.push({ id: prod.id, nome: prod.nome, valor: p.valor, quantidade: p.quantidade, comissao: comProd });
      await db.update(produtosTable).set({ quantidade: prod.quantidade - p.quantidade, updatedAt: new Date() }).where(eq(produtosTable.id, prod.id));
    }
  }
  const valorTotal = valorServico + valorProdutos;
  const comissaoTotal = comissaoServico + comissaoProdutos;
  const now = new Date();
  const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [comanda] = await db.insert(comandasTable).values({
    barbeariaId,
    agendamentoId: id,
    clienteNome: agend.clienteNome,
    profissionalId: agend.profissionalId,
    profissionalNome: agend.profissionalNome,
    mesAno,
    servicos: [{ id: agend.servicoId, nome: agend.servicoNome, valor: valorServico, comissao: comissaoServico }],
    produtos: prodItems,
    pagamentos: pagamentos || [],
    valorTotal: String(valorTotal),
    comissaoTotal: String(comissaoTotal),
    status: "paga",
    observacao: observacao || null,
  }).returning();
  await db.update(agendamentosTable).set({ status: "pago", pago: true, updatedAt: new Date() }).where(eq(agendamentosTable.id, id));
  if (agend.clienteId) {
    const [cli] = await db.select().from(clientesTable).where(eq(clientesTable.id, agend.clienteId)).limit(1);
    if (cli) {
      await db.update(clientesTable).set({
        totalGasto: String(parseFloat(cli.totalGasto as string) + valorTotal),
        pontosFidelidade: cli.pontosFidelidade + Math.floor(valorTotal / 10),
        ultimaVisita: now.toISOString().slice(0, 10),
        updatedAt: new Date(),
      }).where(eq(clientesTable.id, agend.clienteId));
    }
  }
  return res.status(201).json({
    ...comanda,
    valorTotal: parseFloat(comanda.valorTotal as string),
    comissaoTotal: parseFloat(comanda.comissaoTotal as string),
    dataFechamento: comanda.dataFechamento?.toISOString(),
    createdAt: comanda.createdAt?.toISOString(),
  });
});

export default router;
