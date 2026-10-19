import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function carregarBusca() {
  const contexto = { console };
  vm.createContext(contexto);
  const mediaId = fs.readFileSync(new URL("../js/media-id.js", import.meta.url), "utf8");
  const engine = fs.readFileSync(new URL("../js/search-engine.js", import.meta.url), "utf8");
  vm.runInContext(mediaId + "\nglobalThis.MediaIdUtils = MediaIdUtils;", contexto);
  vm.runInContext(engine + "\nglobalThis.SearchEngine = SearchEngine;", contexto);
  return contexto.SearchEngine;
}

const REGISTROS = [
  { ID: "1452B004847", DESCRICAO: "PLANTAÇÃO DE CAFÉ", REPORTER: "GREICE SAUER", LOCAL: "SANTA CATARINA - SC", AFILIADA_EMISSORA: "RBA TV / SC", PROGRAMA: "AGROCULTURA", PGM: "384", EDITORIA: "AGRONEGÓCIO" },
  { ID: "1452B004848", DESCRICAO: "COLHEITA DO CAFÉ", REPORTER: "ANA SILVA", LOCAL: "VITÓRIA / ES", AFILIADA_EMISSORA: "TVE / ES", PROGRAMA: "AGROCULTURA", PGM: "382", EDITORIA: "AGRONEGÓCIO" },
  { ID: "2457B017955", DESCRICAO: "PLANTAÇÃO DE CAFÉ", REPORTER: "GREICE SAUER", LOCAL: "", AFILIADA_EMISSORA: "RBA TV / SC", PROGRAMA: "JORNAL DA CULTURA", PGM: "", EDITORIA: "COTIDIANO", _AFILIADA_UF: "SANTA CATARINA - SC" }
];

test("combina texto e filtros de repórter e UF do local", () => {
  const motor = carregarBusca();
  const res = motor.pesquisar(REGISTROS, 'café reporter:"Greice Sauer" uf:SC');
  assert.deepEqual(Array.from(res, r => r.ID), ["1452B004847"]);
});

test("aceita consulta apenas com programa e número do episódio", () => {
  const motor = carregarBusca();
  const res = motor.pesquisar(REGISTROS, "programa:Agrocultura pgm:382");
  assert.deepEqual(Array.from(res, r => r.ID), ["1452B004848"]);
});

test("canoniza pontuação e acentuação no filtro de afiliada", () => {
  const motor = carregarBusca();
  const res = motor.pesquisar(REGISTROS, 'afiliada:"TVE - ES"');
  assert.deepEqual(Array.from(res, r => r.ID), ["1452B004848"]);
});

test("filtro UF utiliza LOCAL, não confunde com a sede da afiliada", () => {
  const motor = carregarBusca();
  const res = motor.pesquisar(REGISTROS, "uf:SC");
  assert.deepEqual(Array.from(res, r => r.ID), ["1452B004847"]);
});

test("índice de Media IDs permite combinar identificação exata e filtros", () => {
  const motor = carregarBusca();
  const res = motor.pesquisar(REGISTROS, "1452B004847 uf:SC");
  assert.deepEqual(Array.from(res, r => r.ID), ["1452B004847"]);
});

test("reaproveita consultas idênticas e invalida cache após enriquecimento", () => {
  const motor = carregarBusca();
  const dados = [{ ID: "2457B017777", DESCRICAO: "MATERIAL AGRÍCOLA", REPORTER: "" }];
  const primeiro = motor.pesquisar(dados, "repórter:Maria");
  assert.equal(primeiro.length, 0);
  dados[0].REPORTER = "MARIA SILVA";
  assert.equal(motor.pesquisar(dados, "repórter:Maria").length, 0);
  motor.limparCache();
  assert.equal(motor.pesquisar(dados, "repórter:Maria").length, 1);
});

test("filtro PGM ignora diferenças de acentuação, caixa e pontuação", () => {
  const motor = carregarBusca();
  const dados = [
    { ID: "1452B004869", PGM: "Edição Especial 025", PROGRAMA: "AGROCULTURA" },
    { ID: "1452B004870", PGM: "Edição Regular 025", PROGRAMA: "AGROCULTURA" }
  ];
  const resultados = motor.pesquisar(dados, 'pgm:"edicao especial 025"');
  assert.deepEqual(Array.from(resultados, (r) => r.ID), ["1452B004869"]);
});
