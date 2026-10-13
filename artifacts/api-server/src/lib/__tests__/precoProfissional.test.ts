import { test } from "node:test";
import assert from "node:assert/strict";
import { precoDoProfissional, duracaoDoProfissional } from "../precoProfissional.js";

const servico = { preco: "60.00", duracaoMinutos: 30 };

test("sem personalização usa o preço e a duração do serviço", () => {
  assert.equal(precoDoProfissional(servico, null), "60.00");
  assert.equal(precoDoProfissional(servico, { precoOverride: null, tempoOverride: null }), "60.00");
  assert.equal(duracaoDoProfissional(servico, undefined, 45), 30);
});

test("com personalização usa o valor e o tempo do profissional", () => {
  const override = { servicoId: 1, precoOverride: "70.00", tempoOverride: 50 };
  assert.equal(precoDoProfissional(servico, override), "70.00");
  assert.equal(duracaoDoProfissional(servico, override, 45), 50);
});

test("personalização parcial: só o que foi preenchido muda", () => {
  assert.equal(precoDoProfissional(servico, { precoOverride: null, tempoOverride: 50 }), "60.00");
  assert.equal(duracaoDoProfissional(servico, { precoOverride: "70.00", tempoOverride: null }, 45), 30);
});

test("serviço sem duração cai no tempo padrão da agenda", () => {
  assert.equal(duracaoDoProfissional({ preco: "10", duracaoMinutos: null }, null, 45), 45);
  assert.equal(duracaoDoProfissional({ preco: "10", duracaoMinutos: 0 }, { precoOverride: null, tempoOverride: 0 }, 45), 45);
});
