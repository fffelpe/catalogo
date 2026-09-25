import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function carregarResultFilters() {
  const codigo = await readFile(new URL("../js/result-filters.js", import.meta.url), "utf8");
  const contexto = { window: {} };
  vm.runInNewContext(codigo, contexto);
  return contexto.window.ResultFilters;
}

const REGISTROS = [
  {
    ID: "1",
    DATA: "01/09/2026",
    LOCAL: "São Paulo",
    REPORTER: "Ana Souza",
    AFILIADA_EMISSORA: "TV Cultura",
    PROGRAMA: "Jornal da Cultura",
    EDITORIA: "Política"
  },
  {
    ID: "2",
    DATA: "15/09/2026",
    LOCAL: "Brasília",
    REPORTER: "Bruno Lima",
    AFILIADA_EMISSORA: "TV Brasil Central",
    PROGRAMA: "Jornal da Cultura",
    EDITORIA: "Economia"
  },
  {
    ID: "3",
    DATA: "30/09/2026",
    LOCAL: "São Paulo",
    REPORTER: "Ana Souza",
    AFILIADA_EMISSORA: "TV Cultura",
    PROGRAMA: "Agrocultura",
    EDITORIA: "Agronegócio"
  }
];

test("filtra DATA por intervalo inclusivo", async () => {
  const filtros = await carregarResultFilters();
  const resultado = filtros.aplicar(REGISTROS, {
    dataInicio: "2026-09-15",
    dataFim: "2026-09-30"
  });

  assert.deepEqual(Array.from(resultado, (item) => item.ID), ["2", "3"]);
});

test("combina categorias com AND e múltiplos valores da mesma categoria com OR", async () => {
  const filtros = await carregarResultFilters();
  const resultado = filtros.aplicar(REGISTROS, {
    LOCAL: ["São Paulo", "Brasília"],
    REPORTER: ["Ana Souza"],
    PROGRAMA: ["Jornal da Cultura", "Agrocultura"]
  });

  assert.deepEqual(Array.from(resultado, (item) => item.ID), ["1", "3"]);
});

test("normaliza acentos e caixa ao comparar seleções", async () => {
  const filtros = await carregarResultFilters();
  const resultado = filtros.aplicar(REGISTROS, {
    EDITORIA: ["politica"]
  });

  assert.deepEqual(Array.from(resultado, (item) => item.ID), ["1"]);
});

test("gera opções únicas e ordenadas para os seletores", async () => {
  const filtros = await carregarResultFilters();
  const opcoes = filtros.obterOpcoes([
    ...REGISTROS,
    { LOCAL: "São Paulo" },
    { LOCAL: "  Brasília  " },
    { LOCAL: "" }
  ], "LOCAL");

  assert.deepEqual(Array.from(opcoes), ["Brasília", "São Paulo"]);
});

test("identifica quando existe ao menos um filtro ativo", async () => {
  const filtros = await carregarResultFilters();
  assert.equal(filtros.temFiltros({ LOCAL: [], REPORTER: [] }), false);
  assert.equal(filtros.temFiltros({ LOCAL: ["São Paulo"] }), true);
  assert.equal(filtros.temFiltros({ dataInicio: "2026-09-01" }), true);
});
