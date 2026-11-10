import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

function carregarBusca() {
  const sandbox = { console, URL };
  vm.createContext(sandbox);
  for (const [arquivo, nome] of [
    ["media-id.js", "MediaIdUtils"],
    ["sinonimos.js", "VocabularioJornalistico"],
    ["search-engine.js", "SearchEngine"],
  ]) {
    const caminho = fileURLToPath(new URL(`../js/${arquivo}`, import.meta.url));
    vm.runInContext(fs.readFileSync(caminho, "utf8") + `\nglobalThis.${nome} = ${nome};`, sandbox);
  }
  return sandbox;
}

test("ENEM reconhece o nome completo do exame como sinônimo", () => {
  const { VocabularioJornalistico } = carregarBusca();
  const expandidos = VocabularioJornalistico.expandirConsulta("ENEM");
  assert.ok(expandidos.some((item) => item.termo === "exame nacional do ensino medio" && item.tipo === "sinonimo"));
  assert.ok(expandidos.some((item) => item.termo === "estudantes" && item.tipo === "relacionado"));
});

test("ENEM encontra imagens relacionadas, mas prioriza menção direta ao exame", () => {
  const { SearchEngine } = carregarBusca();
  const registros = [
    { ID: "1452B008001", DESCRICAO: "ESTUDANTES EM SALA DE AULA" },
    { ID: "1452B008002", DESCRICAO: "APLICAÇÃO DO ENEM EM ESCOLA" },
    { ID: "1452B008003", DESCRICAO: "OBRAS EM RODOVIA" }
  ];
  const resultados = SearchEngine.pesquisar(registros, "enem");
  assert.equal(resultados[0].ID, "1452B008002");
  assert.ok(resultados.some((item) => item.ID === "1452B008001"));
  assert.equal(resultados.some((item) => item.ID === "1452B008003"), false);
});

test("hospitais encontra médicos, consultas, SUS, UPA e UBS com prioridade exata", () => {
  const { SearchEngine, VocabularioJornalistico } = carregarBusca();
  const expandidos = VocabularioJornalistico.expandirConsulta("hospitais");
  assert.ok(expandidos.some((item) => item.termo === "upa" && item.tipo === "relacionado"));
  assert.ok(expandidos.some((item) => item.termo === "ubs" && item.tipo === "relacionado"));

  const registros = [
    { ID: "1452B008011", DESCRICAO: "MÉDICOS ATENDEM PACIENTES NA UBS" },
    { ID: "1452B008012", DESCRICAO: "HOSPITAIS EM REFORMA" },
    { ID: "1452B008013", DESCRICAO: "CONSULTAS NO SUS E ATENDIMENTO EM UPA" },
    { ID: "1452B008014", DESCRICAO: "COLHEITA DE SOJA" }
  ];
  const resultados = SearchEngine.pesquisar(registros, "hospitais");
  assert.equal(resultados[0].ID, "1452B008012");
  assert.ok(resultados.some((item) => item.ID === "1452B008011"));
  assert.ok(resultados.some((item) => item.ID === "1452B008013"));
  assert.equal(resultados.some((item) => item.ID === "1452B008014"), false);
});

test("termo relacionado não é tratado como sinônimo exato nem como entidade", () => {
  const { VocabularioJornalistico } = carregarBusca();
  const grupo = VocabularioJornalistico.encontrarGrupo("hospitais");
  assert.equal(grupo.chave, "hospital");
  assert.equal(VocabularioJornalistico.encontrarGrupo("upa"), null);
  assert.equal(VocabularioJornalistico.encontrarGrupo("escola"), null);
});
