import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  agendamentosTable, barbeariasTable, profissionaisTable,
  servicosTable, clientesTable, comandasTable, produtosTable,
  bloqueiosHorarioTable, profissionalServicosTable,
  tiposTable, pesquisaSatisfacaoTable
} from "@workspace/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { requireAuth, checkBarbeariaAccess as checkAccess, requireRole } from "../lib/auth.js";
import { getParametros } from "../lib/parametros.js";

const router: IRouter = Router({ mergeParams: true });

async function calcPontosFromPagamentos(barbeariaId: number, pagamentos: any[], valorTotal: number): Promise<number> {
  const formasPagamento = await db.select().from(tiposTable).where(
    and(eq(tiposTable.barbeariaId, barbeariaId), eq(tiposTable.categoria, "forma_pagamento"))
  );
  let totalPontos = 0;
  for (const pag of pagamentos) {
    const pagValor = Number(pag.valor) || 0;
    if (pagValor <= 0) continue;
    let mult = 1;
    if (pag.metodo) {
      const match = formasPagamento.find(f => f.nome.toLowerCase() === pag.metodo.toLowerCase() || f.nome.toLowerCase().includes(pag.metodo.toLowerCase()));
      if (match && match.multiplicadorPontos) {
        mult = parseFloat(match.multiplicadorPontos) || 1;
      }
    }
    totalPontos += Math.floor(pagValor / 10 * mult);
  }
  if (totalPontos === 0 && valorTotal > 0) {
    totalPontos = Math.floor(valorTotal / 10);
  }
  return totalPontos;
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
  const user = (req as any).user;
  if (user.role === "colaborador" && !user.profissionalId) {
    return res.json([]);
  }
  const { data, profissionalId, status, dataInicio, dataFim } = req.query;
  const scopedProfId = user.role === "colaborador"
    ? user.profissionalId
    : (profissionalId ? parseInt(profissionalId as string) : undefined);
  const agendamentos = await db.select().from(agendamentosTable).where(
    and(
      eq(agendamentosTable.barbeariaId, barbeariaId),
      data ? eq(agendamentosTable.data, data as string) : undefined,
      dataInicio ? gte(agendamentosTable.data, dataInicio as string) : undefined,
      dataFim ? lte(agendamentosTable.data, dataFim as string) : undefined,
      scopedProfId ? eq(agendamentosTable.profissionalId, scopedProfId) : undefined,
      status ? eq(agendamentosTable.status, status as string) : undefined,
    )
  );
  return res.json(agendamentos.map(formatAgend));
});

router.post("/", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const { clienteId, clienteNome, clienteTelefone, profissionalId, servicoId, data, horaInicio, semPreferencia, observacao, encaixe } = req.body;
  if (!clienteNome || !clienteTelefone || !profissionalId || !servicoId || !data || !horaInicio) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  if (user.role === "colaborador" && (!user.profissionalId || profissionalId !== user.profissionalId)) {
    return res.status(403).json({ error: "Você só pode criar agendamentos para si mesma" });
  }
  const params = await getParametros(barbeariaId);

  const limiteFuturoDias = parseInt(params["agenda_limite_futuro_dias"] || "30");
  const dataAgend = new Date(data + "T12:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((dataAgend.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias > limiteFuturoDias) {
    return res.status(400).json({ error: `Agendamento não pode exceder ${limiteFuturoDias} dias no futuro` });
  }

  if (user.role === "colaborador") {
    if (params["cliente_agendar_sem_cliente"] === "Sim" && !clienteId) {
      return res.status(400).json({ error: "Seleção de cliente é obrigatória" });
    }
  }

  if (clienteId) {
    const limiteAbertos = parseInt(params["agenda_limite_abertos_cliente"] || "5");
    const abertos = await db.select().from(agendamentosTable).where(
      and(
        eq(agendamentosTable.barbeariaId, barbeariaId),
        eq(agendamentosTable.clienteId, clienteId),
        eq(agendamentosTable.status, "confirmado"),
        gte(agendamentosTable.data, hoje.toISOString().slice(0, 10))
      )
    );
    if (abertos.length >= limiteAbertos) {
      return res.status(400).json({ error: `Cliente atingiu o limite de ${limiteAbertos} agendamentos em aberto` });
    }

    const limiteDiario = parseInt(params["agenda_limite_diario_mesmo_servico"] || "1");
    const mesmoServicoDia = abertos.filter(a => a.data === data && a.servicoId === servicoId);
    if (mesmoServicoDia.length >= limiteDiario) {
      return res.status(400).json({ error: `Limite de ${limiteDiario} agendamento(s) por dia para o mesmo serviço atingido` });
    }

    if (params["agenda_mesmo_horario_cliente"] !== "Sim") {
      const mesmoHorario = abertos.filter(a => a.data === data && a.horaInicio === horaInicio);
      if (mesmoHorario.length > 0) {
        return res.status(409).json({ error: "Cliente já possui agendamento neste horário" });
      }
    }
  }

  const limiteAntecedencia = parseInt(params["agenda_limite_antecedencia"] || "2");
  const agendDataObj = new Date(data + "T" + horaInicio + ":00");
  const agoraDate = new Date();
  const diffMs = agendDataObj.getTime() - agoraDate.getTime();
  const diffHoras = diffMs / (1000 * 60 * 60);
  if (diffHoras < limiteAntecedencia && diffHoras >= 0) {
    return res.status(400).json({ error: `Agendamento requer no mínimo ${limiteAntecedencia} hora(s) de antecedência` });
  }

  const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, servicoId), eq(servicosTable.barbeariaId, barbeariaId))).limit(1);
  if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });
  const [profissional] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, profissionalId), eq(profissionaisTable.barbeariaId, barbeariaId))).limit(1);
  if (!profissional) return res.status(404).json({ error: "Profissional não encontrado" });

  const [profServicoOverride] = await db.select().from(profissionalServicosTable).where(
    and(
      eq(profissionalServicosTable.profissionalId, profissionalId),
      eq(profissionalServicosTable.servicoId, servicoId),
      eq(profissionalServicosTable.barbeariaId, barbeariaId)
    )
  ).limit(1);

  const tempoPadraoStr = params["agenda_tempo_padrao"] || "30min";
  const tempoPadrao = tempoPadraoStr === "1h" ? 60 : (parseInt(tempoPadraoStr) || 30);
  const duracaoFinal = profServicoOverride?.tempoOverride ?? servico.duracaoMinutos ?? tempoPadrao;
  const horaFim = addMinutesToTime(horaInicio, duracaoFinal);
  const valorEfetivo = profServicoOverride?.precoOverride != null ? profServicoOverride.precoOverride : servico.preco;
  if (!encaixe) {
    const bloqueios = await db.select().from(bloqueiosHorarioTable).where(
      and(
        eq(bloqueiosHorarioTable.barbeariaId, barbeariaId),
        eq(bloqueiosHorarioTable.profissionalId, profissionalId),
        eq(bloqueiosHorarioTable.data, data),
      )
    );
    const overlaps = bloqueios.some(b => horaInicio < b.horaFim && horaFim > b.horaInicio);
    if (overlaps) {
      return res.status(409).json({ error: "Este horário está bloqueado para o profissional selecionado" });
    }
  }
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
    profissionalNome: profissional.apelido || profissional.nomeExibicao,
    servicoId,
    servicoNome: servico.nome,
    data,
    horaInicio,
    horaFim,
    status: "confirmado",
    valor: valorEfetivo,
    pago: false,
    semPreferencia: semPreferencia ?? false,
    observacao: observacao || null,
    aniversario: isAniversario,
    vip: false,
    encaixe: encaixe ?? false,
  }).returning();
  return res.status(201).json(formatAgend(agend));
});

router.get("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);
  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });
  if (user.role === "colaborador") {
    if (!user.profissionalId || agend.profissionalId !== user.profissionalId) {
      return res.status(403).json({ error: "Acesso negado" });
    }
  }
  return res.json(formatAgend(agend));
});

router.put("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);
  const { status, profissionalId, data, horaInicio, observacao, pago } = req.body;
  const [existing] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!existing) return res.status(404).json({ error: "Agendamento não encontrado" });
  if (user.role === "colaborador") {
    if (!user.profissionalId || existing.profissionalId !== user.profissionalId) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const params = await getParametros(barbeariaId);
    if (params["cancel_bloquear_edicao_profissional"] === "Sim") {
      return res.status(403).json({ error: "Edição de agendamento bloqueada para profissionais não-gestores" });
    }
  }
  const updates: any = {
    status: status ?? existing.status,
    observacao: observacao ?? existing.observacao,
    pago: pago !== undefined ? pago : existing.pago,
    updatedAt: new Date(),
  };
  if (profissionalId && user.role !== "colaborador") {
    const [prof] = await db.select().from(profissionaisTable).where(eq(profissionaisTable.id, profissionalId)).limit(1);
    if (prof) { updates.profissionalId = profissionalId; updates.profissionalNome = prof.apelido || prof.nomeExibicao; }
  }
  if (data) updates.data = data;
  if (horaInicio) updates.horaInicio = horaInicio;
  const [updated] = await db.update(agendamentosTable).set(updates).where(eq(agendamentosTable.id, id)).returning();
  return res.json(formatAgend(updated));
});

router.delete("/:agendamentoId", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);
  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });

  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador") {
    if (!user.profissionalId) return res.status(403).json({ error: "Acesso negado" });
    if (agend.profissionalId !== user.profissionalId) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    if (params["cancel_bloquear_profissional"] === "Sim") {
      return res.status(403).json({ error: "Cancelamento bloqueado para profissionais não-gestores" });
    }
  }

  if (user.role !== "dono" && user.role !== "gerente") {
    const toleranciaHoras = parseInt(params["cancel_tolerancia_cliente"] || "2");
    if (agend.data && agend.horaInicio) {
      const agendDate = new Date(agend.data + "T" + agend.horaInicio + ":00");
      const agora = new Date();
      const diffMs = agendDate.getTime() - agora.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      if (diffHoras >= 0 && diffHoras < toleranciaHoras) {
        return res.status(400).json({ error: `Cancelamento não permitido com menos de ${toleranciaHoras} hora(s) de antecedência` });
      }
    }
  }

  await db.update(agendamentosTable).set({ status: "cancelado", updatedAt: new Date() }).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId)));
  return res.json({ success: true, message: "Agendamento cancelado" });
});

router.post("/:agendamentoId/checkout", requireAuth, async (req, res) => {
  const barbeariaId = await checkAccess(req, res);
  if (!barbeariaId) return;
  const user = (req as any).user;
  const id = parseInt(req.params.agendamentoId);

  const params = await getParametros(barbeariaId);

  if (user.role === "colaborador") {
    if (params["comanda_fechamento_nao_gestor"] !== "Sim") {
      return res.status(403).json({ error: "Fechamento de comanda não permitido para seu perfil" });
    }
  }

  if (params["comanda_abertura_nao_gestor"] === "Sim" && user.role === "colaborador") {
    return res.status(403).json({ error: "Abertura de comanda bloqueada para profissionais não gestores" });
  }

  const [agend] = await db.select().from(agendamentosTable).where(and(eq(agendamentosTable.id, id), eq(agendamentosTable.barbeariaId, barbeariaId))).limit(1);
  if (!agend) return res.status(404).json({ error: "Agendamento não encontrado" });
  const [profissional] = await db.select().from(profissionaisTable).where(eq(profissionaisTable.id, agend.profissionalId)).limit(1);
  const { produtosAdicionais = [], pagamentos, observacao, desconto: rawDesconto = 0, descontoTipo = "valor", parcelas: rawParcelas = 1, gorjeta, tipoComanda } = req.body;

  if (params["comanda_obrigatoriedade_bandeira"] === "Sim") {
    if (Array.isArray(pagamentos) && pagamentos.length > 0) {
      const semBandeira = pagamentos.some((p: any) => (p.metodo === "credito" || p.metodo === "debito") && !p.bandeira);
      if (semBandeira) {
        return res.status(400).json({ error: "Seleção de bandeira é obrigatória para pagamentos em cartão" });
      }
    }
  }

  const desconto = Math.max(0, Number(rawDesconto) || 0);
  const parcelas = Math.max(1, Math.floor(Number(rawParcelas) || 1));
  const valorServico = parseFloat(agend.valor as string);

  const [profServicoLink] = profissional ? await db.select().from(profissionalServicosTable).where(
    and(
      eq(profissionalServicosTable.profissionalId, agend.profissionalId),
      eq(profissionalServicosTable.servicoId, agend.servicoId),
      eq(profissionalServicosTable.barbeariaId, barbeariaId)
    )
  ).limit(1) : [undefined];

  const hasComissaoOverride = profServicoLink?.comissaoOverride != null;
  const comissaoPerc = hasComissaoOverride
    ? parseFloat(profServicoLink!.comissaoOverride!)
    : (profissional ? parseFloat(profissional.comissaoValor as string) : 40);
  let comissaoServico = (hasComissaoOverride || profissional?.comissaoTipo === "percentual")
    ? (valorServico * comissaoPerc) / 100
    : comissaoPerc;

  const comissaoEditavel = params["comanda_edicao_comissoes"] || "Liberar";
  if (comissaoEditavel === "Bloquear" && req.body.comissaoCustom !== undefined) {
    comissaoServico = (hasComissaoOverride || profissional?.comissaoTipo === "percentual")
      ? (valorServico * comissaoPerc) / 100
      : comissaoPerc;
  } else if (comissaoEditavel === "Liberar" && req.body.comissaoCustom !== undefined) {
    comissaoServico = Math.max(0, Number(req.body.comissaoCustom) || comissaoServico);
  }
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
  let valorTotal = valorServico + valorProdutos;
  if (desconto > 0) {
    if (descontoTipo === "percentual") {
      const clampedPct = Math.min(desconto, 100);
      valorTotal = valorTotal * (1 - clampedPct / 100);
    } else {
      valorTotal = Math.max(0, valorTotal - desconto);
    }
  }
  valorTotal = Math.max(0, valorTotal);
  const gorjetaVal = gorjeta ? { profissionalId: gorjeta.profissionalId ?? agend.profissionalId, valor: Number(gorjeta.valor) || 0 } : null;
  if (gorjetaVal && gorjetaVal.valor > 0) {
    valorTotal += gorjetaVal.valor;
  }
  const comissaoTotal = comissaoServico + comissaoProdutos;
  const now = new Date();
  const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let taxaCartaoTotal = 0;
  let dataCompensacao: string | null = null;
  const pags = Array.isArray(pagamentos) ? pagamentos : [];
  for (const pag of pags) {
    if ((pag.metodo === "credito" || pag.metodo === "debito") && pag.bandeira) {
      const [bandeira] = await db.select().from(tiposTable).where(
        and(eq(tiposTable.barbeariaId, barbeariaId), eq(tiposTable.categoria, "bandeira"), eq(tiposTable.nome, pag.bandeira))
      ).limit(1);
      if (bandeira && bandeira.taxaOperadora) {
        const taxa = (Number(pag.valor) * parseFloat(bandeira.taxaOperadora)) / 100;
        taxaCartaoTotal += taxa;
        if (!dataCompensacao && bandeira.diasRecebimento) {
          const comp = new Date(now);
          const dias = bandeira.diasRecebimento;
          if (bandeira.diasUteis) {
            let added = 0;
            while (added < dias) {
              comp.setDate(comp.getDate() + 1);
              const day = comp.getDay();
              if (day !== 0 && day !== 6) added++;
            }
          } else {
            comp.setDate(comp.getDate() + dias);
          }
          dataCompensacao = comp.toISOString().slice(0, 10);
        }
      }
    }
  }
  const valorLiquido = valorTotal - taxaCartaoTotal;

  const [comanda] = await db.insert(comandasTable).values({
    barbeariaId,
    agendamentoId: id,
    clienteNome: agend.clienteNome,
    profissionalId: agend.profissionalId,
    profissionalNome: agend.profissionalNome,
    mesAno,
    servicos: [{ id: agend.servicoId, nome: agend.servicoNome, valor: valorServico, comissao: comissaoServico }],
    produtos: prodItems,
    pagamentos: pags,
    gorjeta: gorjetaVal,
    tipoComanda: tipoComanda ?? "cliente",
    valorTotal: String(valorTotal),
    valorLiquido: String(valorLiquido),
    taxaCartao: taxaCartaoTotal > 0 ? String(taxaCartaoTotal) : null,
    dataCompensacao,
    comissaoTotal: String(comissaoTotal),
    desconto: String(desconto),
    descontoTipo,
    parcelas,
    status: "paga",
    observacao: observacao || null,
    cadastradoPor: profissional?.nomeExibicao || agend.profissionalNome,
  }).returning();
  await db.update(agendamentosTable).set({ status: "pago", pago: true, updatedAt: new Date() }).where(eq(agendamentosTable.id, id));
  if (agend.clienteId) {
    const [cli] = await db.select().from(clientesTable).where(eq(clientesTable.id, agend.clienteId)).limit(1);
    if (cli) {
      const pontos = await calcPontosFromPagamentos(barbeariaId, pags, valorTotal);
      await db.update(clientesTable).set({
        totalGasto: String(parseFloat(cli.totalGasto as string) + valorTotal),
        pontosFidelidade: cli.pontosFidelidade + pontos,
        ultimaVisita: now.toISOString().slice(0, 10),
        updatedAt: new Date(),
      }).where(eq(clientesTable.id, agend.clienteId));
    }
  }

  try {
    const pesquisas = await db.select().from(pesquisaSatisfacaoTable).where(
      and(eq(pesquisaSatisfacaoTable.barbeariaId, barbeariaId), eq(pesquisaSatisfacaoTable.ativo, true), eq(pesquisaSatisfacaoTable.envioAutomatico, true))
    ).limit(1);
    if (pesquisas.length > 0 && agend.clienteTelefone) {
      const pesquisa = pesquisas[0];
      const [barb] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId)).limit(1);
      console.log(`[Pesquisa Auto] Survey ${pesquisa.id} would be sent to ${agend.clienteNome} (${agend.clienteTelefone}) for ${barb?.nome || "barbearia"}`);
    }
  } catch (e) {
    console.error("[Pesquisa Auto] Error:", e);
  }

  return res.status(201).json({
    ...comanda,
    valorTotal: parseFloat(comanda.valorTotal as string),
    valorLiquido: comanda.valorLiquido != null ? parseFloat(comanda.valorLiquido as string) : null,
    taxaCartao: comanda.taxaCartao != null ? parseFloat(comanda.taxaCartao as string) : null,
    comissaoTotal: parseFloat(comanda.comissaoTotal as string),
    dataFechamento: comanda.dataFechamento?.toISOString(),
    createdAt: comanda.createdAt?.toISOString(),
  });
});

export default router;
