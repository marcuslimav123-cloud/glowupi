import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import http from "node:http";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  sessionsTable,
  barbeariasTable,
  profissionaisTable,
  servicosTable,
  produtosTable,
  agendamentosTable,
  comandasTable,
  parametrosConfigTable,
  notificacoesTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import agendamentosRouter from "../agendamentos.js";

let server: http.Server;
let baseUrl: string;
const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

let userId: number;
let token: string;
let barbeariaId: number;
let servicoId: number;
let produtoId: number;
let profZeroId: number;
let profQuarentaId: number;

async function criarAgendamento(profissionalId: number, profNome: string) {
  const [a] = await db.insert(agendamentosTable).values({
    barbeariaId,
    clienteNome: "Cliente Comissão",
    clienteTelefone: "11999990000",
    profissionalId,
    profissionalNome: profNome,
    servicoId,
    servicoNome: "Corte",
    data: new Date().toISOString().slice(0, 10),
    horaInicio: "09:00",
    horaFim: "09:30",
    status: "confirmado",
    valor: "50.00",
  }).returning();
  return a.id;
}

async function checkout(agendamentoId: number) {
  const res = await fetch(`${baseUrl}/api/barbearias/${barbeariaId}/agendamentos/${agendamentoId}/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `session=${token}` },
    body: JSON.stringify({
      pagamentos: [{ metodo: "dinheiro", valor: 210 }],
      produtosAdicionais: [{ produtoId, valor: 80, quantidade: 2 }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  assert.ok(res.status === 200 || res.status === 201, JSON.stringify(body));
  const [comanda] = await db.select().from(comandasTable).where(eq(comandasTable.agendamentoId, agendamentoId));
  assert.ok(comanda, "comanda não criada");
  return comanda;
}

before(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
  const [user] = await db.insert(usersTable).values({ nome: "Dono Comissão", email: `comissao_${SUFFIX}@test.local`, role: "dono" }).returning();
  userId = user.id;
  const [barb] = await db.insert(barbeariasTable).values({ donoId: user.id, nome: `Comissão ${SUFFIX}`, slug: `comissao-${SUFFIX}` }).returning();
  barbeariaId = barb.id;
  token = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({ token, userId, expiresAt: new Date(Date.now() + 3600_000) });

  const [serv] = await db.insert(servicosTable).values({ barbeariaId, nome: "Corte", preco: "50.00", duracaoMinutos: 30 }).returning();
  servicoId = serv.id;
  const [prod] = await db.insert(produtosTable).values({ barbeariaId, nome: "Pomada", preco: "80.00", quantidade: 50 }).returning();
  produtoId = prod.id;
  const [pz] = await db.insert(profissionaisTable).values({ barbeariaId, nomeExibicao: "Dono Zero", comissaoTipo: "percentual", comissaoValor: "0" }).returning();
  profZeroId = pz.id;
  const [pq] = await db.insert(profissionaisTable).values({ barbeariaId, nomeExibicao: "Barbeiro 40", comissaoTipo: "percentual", comissaoValor: "40" }).returning();
  profQuarentaId = pq.id;

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/barbearias/:barbeariaId/agendamentos", agendamentosRouter);
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("server address unavailable");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  try {
    await db.delete(notificacoesTable).where(eq(notificacoesTable.barbeariaId, barbeariaId));
    await db.delete(comandasTable).where(eq(comandasTable.barbeariaId, barbeariaId));
    await db.delete(agendamentosTable).where(eq(agendamentosTable.barbeariaId, barbeariaId));
    await db.delete(parametrosConfigTable).where(eq(parametrosConfigTable.barbeariaId, barbeariaId));
    await db.delete(produtosTable).where(eq(produtosTable.barbeariaId, barbeariaId));
    await db.delete(servicosTable).where(eq(servicosTable.barbeariaId, barbeariaId));
    await db.delete(profissionaisTable).where(eq(profissionaisTable.barbeariaId, barbeariaId));
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    await db.delete(barbeariasTable).where(eq(barbeariasTable.id, barbeariaId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  } catch (e) {
    console.error("[comissao/cleanup]", e);
  }
});

describe("Checkout — comissão de serviços e produtos", () => {
  it("profissional com 0% não recebe comissão nem sobre produtos", async () => {
    const comanda = await checkout(await criarAgendamento(profZeroId, "Dono Zero"));
    assert.equal(Number(comanda.valorTotal), 210);
    assert.equal(Number(comanda.comissaoTotal), 0);
    const produtos = comanda.produtos as any[];
    assert.equal(produtos.length, 1);
    assert.equal(Number(produtos[0].comissao), 0);
  });

  it("por padrão não há comissão sobre produtos, só sobre o serviço", async () => {
    const comanda = await checkout(await criarAgendamento(profQuarentaId, "Barbeiro 40"));
    // serviço 50 * 40% = 20; produtos 160 * 0% = 0
    assert.equal(Number(comanda.comissaoTotal), 20);
    assert.equal(Number((comanda.produtos as any[])[0].comissao), 0);
  });

  it("estabelecimento que liga a comissão sobre produtos (parâmetro) paga a porcentagem definida", async () => {
    await db.insert(parametrosConfigTable).values({ barbeariaId, chave: "comissao_produtos_percentual", valor: "10", tipo: "input" });
    const comanda = await checkout(await criarAgendamento(profQuarentaId, "Barbeiro 40"));
    // serviço 50 * 40% = 20; produtos 160 * 10% = 16
    assert.equal(Number(comanda.comissaoTotal), 36);
  });
});
