import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import http from "node:http";
import crypto from "node:crypto";
import { db, pool } from "@workspace/db";
import {
  usersTable,
  sessionsTable,
  barbeariasTable,
  profissionaisTable,
  servicosTable,
  agendamentosTable,
  cuponsTable,
  comandasTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import agendamentosRouter from "../agendamentos.js";

type Fixture = {
  userId: number;
  token: string;
  barbeariaId: number;
  profissionalId: number;
  servicoId: number;
  agendamentoId: number;
  cupomValidoId: number;
  cupomEsgotadoId: number;
  outraBarbeariaId: number;
  outroUserId: number;
  cupomOutraBarbeariaId: number;
};

let server: http.Server;
let baseUrl: string;
let fx: Fixture;

const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

async function setupBarbearia(prefix: string): Promise<{ userId: number; barbeariaId: number; token: string }> {
  const [user] = await db.insert(usersTable).values({
    nome: `${prefix} Owner`,
    email: `${prefix}_${SUFFIX}@test.local`,
    role: "dono",
  }).returning();
  const [barb] = await db.insert(barbeariasTable).values({
    donoId: user.id,
    nome: `${prefix} Barbearia ${SUFFIX}`,
    slug: `${prefix}-${SUFFIX}`,
  }).returning();
  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { userId: user.id, barbeariaId: barb.id, token };
}

async function createAgendamento(barbeariaId: number, profissionalId: number, servicoId: number, profNome: string, servNome: string, valor: string) {
  const [a] = await db.insert(agendamentosTable).values({
    barbeariaId,
    clienteNome: "Cliente Teste",
    clienteTelefone: "11999999999",
    profissionalId,
    profissionalNome: profNome,
    servicoId,
    servicoNome: servNome,
    data: new Date().toISOString().slice(0, 10),
    horaInicio: "10:00",
    horaFim: "10:30",
    status: "confirmado",
    valor,
  }).returning();
  return a.id;
}

before(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for integration tests");
  }

  const main = await setupBarbearia("checkoutcup");
  const other = await setupBarbearia("outracup");

  const [prof] = await db.insert(profissionaisTable).values({
    barbeariaId: main.barbeariaId,
    nomeExibicao: "Prof Teste",
    apelido: "Prof",
    comissaoTipo: "percentual",
    comissaoValor: "40",
  }).returning();

  const [serv] = await db.insert(servicosTable).values({
    barbeariaId: main.barbeariaId,
    nome: "Corte Teste",
    preco: "50.00",
    duracaoMinutos: 30,
  }).returning();

  const agendamentoId = await createAgendamento(main.barbeariaId, prof.id, serv.id, prof.apelido!, serv.nome, serv.preco as string);

  const [cupomValido] = await db.insert(cuponsTable).values({
    barbeariaId: main.barbeariaId,
    codigo: `VALIDO_${SUFFIX}`,
    tipo: "valor",
    valor: "10.00",
    ativo: true,
    usoMaximo: 100,
  }).returning();

  const [cupomEsgotado] = await db.insert(cuponsTable).values({
    barbeariaId: main.barbeariaId,
    codigo: `ESGOTADO_${SUFFIX}`,
    tipo: "valor",
    valor: "10.00",
    ativo: true,
    usoMaximo: 1,
  }).returning();
  await db.update(cuponsTable).set({ usoAtual: 1 }).where(eq(cuponsTable.id, cupomEsgotado.id));

  const [cupomOutra] = await db.insert(cuponsTable).values({
    barbeariaId: other.barbeariaId,
    codigo: `OUTRA_${SUFFIX}`,
    tipo: "valor",
    valor: "10.00",
    ativo: true,
    usoMaximo: 100,
  }).returning();

  fx = {
    userId: main.userId,
    token: main.token,
    barbeariaId: main.barbeariaId,
    profissionalId: prof.id,
    servicoId: serv.id,
    agendamentoId,
    cupomValidoId: cupomValido.id,
    cupomEsgotadoId: cupomEsgotado.id,
    outraBarbeariaId: other.barbeariaId,
    outroUserId: other.userId,
    cupomOutraBarbeariaId: cupomOutra.id,
  };

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/barbearias/:barbeariaId/agendamentos", agendamentosRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("server address unavailable");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  if (fx) {
    try {
      await db.delete(comandasTable).where(eq(comandasTable.barbeariaId, fx.barbeariaId));
      await db.delete(agendamentosTable).where(eq(agendamentosTable.barbeariaId, fx.barbeariaId));
      await db.delete(cuponsTable).where(eq(cuponsTable.barbeariaId, fx.barbeariaId));
      await db.delete(cuponsTable).where(eq(cuponsTable.barbeariaId, fx.outraBarbeariaId));
      await db.delete(servicosTable).where(eq(servicosTable.barbeariaId, fx.barbeariaId));
      await db.delete(profissionaisTable).where(eq(profissionaisTable.barbeariaId, fx.barbeariaId));
      await db.delete(sessionsTable).where(eq(sessionsTable.userId, fx.userId));
      await db.delete(barbeariasTable).where(eq(barbeariasTable.id, fx.barbeariaId));
      await db.delete(barbeariasTable).where(eq(barbeariasTable.id, fx.outraBarbeariaId));
      await db.delete(usersTable).where(eq(usersTable.id, fx.userId));
      await db.delete(usersTable).where(eq(usersTable.id, fx.outroUserId));
    } catch (err) {
      console.error("[cleanup] error:", err);
    }
  }
  await pool.end();
});

async function checkout(agendamentoId: number, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/api/barbearias/${fx.barbeariaId}/agendamentos/${agendamentoId}/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${fx.token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json as any };
}

async function getCupom(id: number) {
  const [row] = await db.select().from(cuponsTable).where(eq(cuponsTable.id, id)).limit(1);
  return row;
}

async function countComandasForAgendamento(agendamentoId: number) {
  const rows = await db.select().from(comandasTable).where(eq(comandasTable.agendamentoId, agendamentoId));
  return rows;
}

describe("POST /agendamentos/:id/checkout — integridade do cupom", () => {
  it("checkout COM cupom de outra barbearia falha (400) e não avança o contador nem cria comanda", async () => {
    const before = await getCupom(fx.cupomOutraBarbeariaId);

    const agendId = await createAgendamento(
      fx.barbeariaId,
      fx.profissionalId,
      fx.servicoId,
      "Prof",
      "Corte Teste",
      "50.00",
    );

    const res = await checkout(agendId, {
      pagamentos: [{ metodo: "dinheiro", valor: 40 }],
      cupomId: fx.cupomOutraBarbeariaId,
      desconto: 10,
    });

    assert.equal(res.status, 400);
    assert.match(String(res.body.error || ""), /cupom/i, "deve retornar mensagem clara sobre cupom");

    const after = await getCupom(fx.cupomOutraBarbeariaId);
    assert.equal(after.usoAtual, before.usoAtual, "cupom de outra barbearia não deve ser incrementado");

    const comandas = await countComandasForAgendamento(agendId);
    assert.equal(comandas.length, 0, "nenhuma comanda deve ser criada quando o cupom é inválido");
  });

  it("checkout COM cupom esgotado (uso_atual >= uso_maximo) falha (400) e não cria comanda", async () => {
    const before = await getCupom(fx.cupomEsgotadoId);

    const agendId = await createAgendamento(
      fx.barbeariaId,
      fx.profissionalId,
      fx.servicoId,
      "Prof",
      "Corte Teste",
      "50.00",
    );

    const res = await checkout(agendId, {
      pagamentos: [{ metodo: "dinheiro", valor: 40 }],
      cupomId: fx.cupomEsgotadoId,
      desconto: 10,
    });

    assert.equal(res.status, 400);
    assert.match(String(res.body.error || ""), /(limite|uso|esgotad|atingiu)/i);

    const after = await getCupom(fx.cupomEsgotadoId);
    assert.equal(after.usoAtual, before.usoAtual, "cupom esgotado não deve ser re-incrementado");

    const comandas = await countComandasForAgendamento(agendId);
    assert.equal(comandas.length, 0, "nenhuma comanda deve ser criada quando o cupom está esgotado");
  });

  it("checkout COM cupom válido cria comanda com cupom_id/cupom_desconto e incrementa contador exatamente em +1", async () => {
    const before = await getCupom(fx.cupomValidoId);

    const res = await checkout(fx.agendamentoId, {
      pagamentos: [{ metodo: "dinheiro", valor: 40 }],
      cupomId: fx.cupomValidoId,
      desconto: 10,
    });

    assert.equal(res.status, 201, `esperava 201, recebi ${res.status}: ${JSON.stringify(res.body)}`);

    const after = await getCupom(fx.cupomValidoId);
    assert.equal(after.usoAtual, before.usoAtual + 1, "uso_atual deve subir exatamente 1 (sem dupla contagem)");

    const comandas = await countComandasForAgendamento(fx.agendamentoId);
    assert.equal(comandas.length, 1, "deve existir exatamente 1 comanda gravada");
    const cmd = comandas[0];
    assert.equal(cmd.cupomId, fx.cupomValidoId, "cupom_id deve estar gravado no comanda");
    assert.ok(cmd.cupomDesconto != null, "cupom_desconto deve estar gravado");
    assert.equal(parseFloat(cmd.cupomDesconto as string), 10);
    assert.equal(parseFloat(cmd.valorTotal as string), 40, "valor_total deve refletir o valor após desconto");
  });

  it("checkout SEM cupom continua funcionando (compatibilidade preservada) e não toca em nenhum cupom", async () => {
    const beforeValido = await getCupom(fx.cupomValidoId);
    const beforeEsgotado = await getCupom(fx.cupomEsgotadoId);

    const agendId = await createAgendamento(
      fx.barbeariaId,
      fx.profissionalId,
      fx.servicoId,
      "Prof",
      "Corte Teste",
      "50.00",
    );

    const res = await checkout(agendId, {
      pagamentos: [{ metodo: "dinheiro", valor: 50 }],
    });

    assert.equal(res.status, 201, `esperava 201, recebi ${res.status}: ${JSON.stringify(res.body)}`);

    const comandas = await countComandasForAgendamento(agendId);
    assert.equal(comandas.length, 1);
    const cmd = comandas[0];
    assert.equal(cmd.cupomId, null, "comanda sem cupom deve ter cupom_id null");
    assert.equal(cmd.cupomDesconto, null, "comanda sem cupom deve ter cupom_desconto null");

    const afterValido = await getCupom(fx.cupomValidoId);
    const afterEsgotado = await getCupom(fx.cupomEsgotadoId);
    assert.equal(afterValido.usoAtual, beforeValido.usoAtual, "checkout sem cupom não deve mexer em outros cupons");
    assert.equal(afterEsgotado.usoAtual, beforeEsgotado.usoAtual);
  });
});
