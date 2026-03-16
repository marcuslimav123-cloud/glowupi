import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { barbeariasTable, servicosTable, profissionaisTable, agendamentosTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

  const [servicos, profissionais] = await Promise.all([
    db.select().from(servicosTable).where(and(eq(servicosTable.barbeariaId, barbearia.id), eq(servicosTable.ativo, true))),
    db.select().from(profissionaisTable).where(and(eq(profissionaisTable.barbeariaId, barbearia.id), eq(profissionaisTable.ativo, true))),
  ]);

  return res.json({
    id: barbearia.id,
    nome: barbearia.nome,
    slug: barbearia.slug,
    telefone: barbearia.telefone,
    cidade: barbearia.cidade,
    uf: barbearia.uf,
    corPrimaria: barbearia.corPrimaria,
    logoUrl: barbearia.logoUrl,
    horarioFuncionamento: barbearia.horarioFuncionamento,
    servicos: servicos.map(s => ({ ...s, preco: parseFloat(s.preco as string), createdAt: s.createdAt?.toISOString(), updatedAt: s.updatedAt?.toISOString() })),
    profissionais: profissionais.map(p => ({ ...p, comissaoValor: parseFloat(p.comissaoValor as string), createdAt: p.createdAt?.toISOString(), updatedAt: p.updatedAt?.toISOString() })),
  });
});

router.post("/:slug/agendar", async (req, res) => {
  const { slug } = req.params;
  const [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.slug, slug)).limit(1);
  if (!barbearia) return res.status(404).json({ error: "Barbearia não encontrada" });

  const { clienteNome, clienteTelefone, clienteEmail, profissionalId, servicoId, data, horaInicio, semPreferencia, observacao } = req.body;
  if (!clienteNome || !clienteTelefone || !profissionalId || !servicoId || !data || !horaInicio) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  const [servico] = await db.select().from(servicosTable).where(and(eq(servicosTable.id, servicoId), eq(servicosTable.barbeariaId, barbearia.id))).limit(1);
  if (!servico) return res.status(404).json({ error: "Serviço não encontrado" });
  const [profissional] = await db.select().from(profissionaisTable).where(and(eq(profissionaisTable.id, profissionalId), eq(profissionaisTable.barbeariaId, barbearia.id))).limit(1);
  if (!profissional) return res.status(404).json({ error: "Profissional não encontrado" });

  const horaFim = addMinutes(horaInicio, servico.duracaoMinutos);
  const [agend] = await db.insert(agendamentosTable).values({
    barbeariaId: barbearia.id,
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
    aniversario: false,
    vip: false,
  }).returning();

  return res.status(201).json({
    ...agend,
    valor: parseFloat(agend.valor as string),
    createdAt: agend.createdAt?.toISOString(),
    updatedAt: agend.updatedAt?.toISOString(),
  });
});

export default router;
