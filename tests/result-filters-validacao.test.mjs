import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const contexto = { window: {} };
vm.runInNewContext(readFileSync(new URL("../js/result-filters.js", import.meta.url), "utf8"), contexto);
const filtros = contexto.window.ResultFilters;

test("filtro por UF aceita apenas siglas brasileiras válidas", () => {
  const registros = [
    { LOCAL: "Campinas - SP" },
    { LOCAL: "São Paulo / BR" },
    { LOCAL: "Curitiba - PR" },
    { LOCAL: "Brasil - ZZ" }
  ];
  assert.deepEqual(Array.from(filtros.obterOpcoes(registros, "UF")), ["PR", "SP"]);
  assert.equal(filtros.aplicar(registros, { UF: ["SP"] }).length, 1);
  assert.equal(filtros.aplicar(registros, { UF: ["BR"] }).length, 0);
});

test("filtro de datas interpreta anos de dois dígitos como o carregador", () => {
  assert.equal(filtros.dataParaNumero("20/11/26"), 20261120);
  assert.equal(filtros.dataParaNumero("31/12/99"), 19991231);
  assert.equal(filtros.dataParaNumero("29/02/23"), null);
  assert.equal(filtros.aplicar([{ DATA: "20/11/26" }], {
    dataInicio: "2026-11-01",
    dataFim: "2026-11-30"
  }).length, 1);
});
