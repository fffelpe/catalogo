import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function carregarBusca() {
  const contexto = { console };
  vm.createContext(contexto);
  for (const [arquivo, nome] of [
    ["media-id.js", "MediaIdUtils"],
    ["sinonimos.js", "VocabularioJornalistico"],
    ["search-engine.js", "SearchEngine"]
  ]) {
    const codigo = fs.readFileSync(new URL(`../js/${arquivo}`, import.meta.url), "utf8");
    vm.runInContext(codigo + `\nglobalThis.${nome} = ${nome};`, contexto);
  }
  return contexto.SearchEngine;
}

test("busca natural combina enchente, moradores e salvamento sem trazer resultados isolados", () => {
  const busca = carregarBusca();
  const registros = [
    { ID: "1452B005001", DESCRICAO: "EQUIPE DE RESGATE RETIRA MORADORES DE ÁREA ALAGADA" },
    { ID: "1452B005002", DESCRICAO: "MORADORES PARTICIPAM DE EVENTO CULTURAL" },
    { ID: "1452B005003", DESCRICAO: "ENCHENTE ATINGE RODOVIA" }
  ];
  const encontrados = busca.pesquisar(registros, "quero imagens de enchentes com pessoas sendo resgatadas");
  assert.deepEqual(Array.from(encontrados, (r) => r.ID), ["1452B005001"]);
  assert.ok(encontrados[0]._SEARCH_MATCHES.some((m) => m.tipo === "linguagem-natural"));
});

test("busca natural entende plantação de soja vista de cima", () => {
  const busca = carregarBusca();
  const registros = [
    { ID: "1452B005010", DESCRICAO: "IMAGEM AÉREA DE LAVOURA DE SOJA" },
    { ID: "1452B005011", DESCRICAO: "COLHEITA DE SOJA NO INTERIOR" },
    { ID: "1452B005012", DESCRICAO: "DRONE SOBRE CONGESTIONAMENTO" }
  ];
  const ids = busca.pesquisar(registros, "procuro plantações de soja vistas de cima").map((r) => r.ID);
  assert.deepEqual(Array.from(ids), ["1452B005010"]);
});

test("busca natural combina transporte, passageiros e espera na estação", () => {
  const busca = carregarBusca();
  const registros = [
    { ID: "1452B005020", DESCRICAO: "PASSAGEIROS AGUARDAM TREM NA ESTAÇÃO" },
    { ID: "1452B005021", DESCRICAO: "TREM CRUZA PONTE" },
    { ID: "1452B005022", DESCRICAO: "PASSAGEIROS NO AEROPORTO" }
  ];
  const ids = busca.pesquisar(registros, "quero cenas de passageiros esperando em estação de trem")
    .map((r) => r.ID);
  assert.deepEqual(Array.from(ids), ["1452B005020"]);
});

test("mantém resultados parciais se não há registro com múltiplos elementos", () => {
  const busca = carregarBusca();
  const registros = [
    { ID: "1452B005030", DESCRICAO: "ENCHENTE ATINGE CASAS" },
    { ID: "1452B005031", DESCRICAO: "PASSEIO DE MORADORES" }
  ];
  const resultado = busca.pesquisar(registros, "quero imagens de enchentes com pessoas sendo resgatadas");
  assert.ok(resultado.length > 0);
  assert.equal(resultado[0].ID, "1452B005030");
});

test("busca por Media ID continua exata e tem prioridade máxima", () => {
  const busca = carregarBusca();
  const registros = [
    { ID: "1452B005040", DESCRICAO: "CENA AÉREA DE LAVOURA" },
    { ID: "1452B005041", DESCRICAO: "ENCHENTE ATINGE MORADORES" }
  ];
  const resultados = busca.pesquisar(registros, "1452B005040");
  assert.deepEqual(Array.from(resultados, (r) => r.ID), ["1452B005040"]);
  assert.equal(resultados[0]._SEARCH_SCORE, 10000);
});

test("filtros estruturados continuam compatíveis com consulta em linguagem natural", () => {
  const busca = carregarBusca();
  const registros = [
    { ID: "1452B005050", PROGRAMA: "AGROCULTURA", LOCAL: "CAMPO GRANDE - MS",
      DESCRICAO: "VISTA AÉREA DE LAVOURA DE SOJA" },
    { ID: "1452B005051", PROGRAMA: "JORNAL DA CULTURA", LOCAL: "CURITIBA - PR",
      DESCRICAO: "VISTA AÉREA DE LAVOURA DE SOJA" }
  ];
  const resultados = busca.pesquisar(registros,
    'quero imagens de plantações de soja vistas de cima programa:Agrocultura');
  assert.deepEqual(Array.from(resultados, (r) => r.ID), ["1452B005050"]);
});
