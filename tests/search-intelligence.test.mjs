import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const paths = {
  mediaId: fileURLToPath(new URL("../js/media-id.js", import.meta.url)),
  vocabulario: fileURLToPath(new URL("../js/sinonimos.js", import.meta.url)),
  enrichment: fileURLToPath(new URL("../js/media-enrichment.js", import.meta.url)),
  segments: fileURLToPath(new URL("../js/media-segments.js", import.meta.url)),
  search: fileURLToPath(new URL("../js/search-engine.js", import.meta.url)),
  autocomplete: fileURLToPath(new URL("../js/autocomplete.js", import.meta.url))
};

function carregar() {
  const sandbox = {
    console,
    URL,
    fetch: async () => ({ ok: true, json: async () => ({ schemaVersion: 1, items: {} }) })
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(paths.mediaId, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(paths.vocabulario, "utf8") + "\nglobalThis.VocabularioJornalistico = VocabularioJornalistico;", sandbox);
  vm.runInContext(fs.readFileSync(paths.enrichment, "utf8") + "\nglobalThis.MediaEnrichment = MediaEnrichment;", sandbox);
  vm.runInContext(fs.readFileSync(paths.segments, "utf8") + "\nglobalThis.MediaSegments = MediaSegments;", sandbox);
  vm.runInContext(fs.readFileSync(paths.search, "utf8") + "\nglobalThis.SearchEngine = SearchEngine;", sandbox);
  vm.runInContext(fs.readFileSync(paths.autocomplete, "utf8") + "\nglobalThis.AutocompleteBusca = AutocompleteBusca;", sandbox);
  return sandbox;
}

test("busca encontra termo com erro de digitação sem derrubar prioridade exata", () => {
  const { SearchEngine } = carregar();
  const registros = [
    { ID: "1452B005001", DESCRICAO: "JAIR BOLSONARO EM COLETIVA", PROGRAMA: "Jornal da Cultura" },
    { ID: "1452B005002", DESCRICAO: "MERCADO FINANCEIRO E DÓLAR", PROGRAMA: "Jornal da Cultura" }
  ];

  const resultados = SearchEngine.pesquisar(registros, "bolsonro");
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].ID, "1452B005001");
  assert.ok(resultados[0]._SEARCH_MATCHES.some((item) => item.tipo === "fuzzy"));
});

test("busca semântica por conceito encontra registro sem repetir as mesmas palavras", () => {
  const { SearchEngine } = carregar();
  const registros = [
    { ID: "1452B005010", DESCRICAO: "PACIENTES EM FILA NO HOSPITAL", PROGRAMA: "Jornal da Cultura" }
  ];

  const resultados = SearchEngine.pesquisar(registros, "atendimento médico");
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].ID, "1452B005010");
  assert.ok(resultados[0]._SEARCH_MATCHES.some((item) => item.tipo === "semantico"));
});

test("reconhece organização presente no enriquecimento como entidade da consulta", () => {
  const { MediaEnrichment, SearchEngine } = carregar();
  MediaEnrichment._definirParaTeste({
    "1452B005020": {
      organizations: ["Petrobras"],
      keywords: ["combustíveis"]
    }
  });

  const resultados = SearchEngine.pesquisar([
    { ID: "1452B005020", DESCRICAO: "COLETIVA SOBRE PREÇOS", PROGRAMA: "Jornal da Cultura" }
  ], "Petrobras");

  assert.equal(resultados.length, 1);
  assert.ok(resultados[0]._SEARCH_ENTITIES.some((item) => item.tipo === "organizacao"));
});

test("vocabulário controlado devolve forma canônica e conceitos relacionados", () => {
  const { VocabularioJornalistico } = carregar();
  assert.equal(VocabularioJornalistico.canonizar("STF"), "supremo tribunal federal");

  const conceitos = VocabularioJornalistico.extrairConceitos("atendimento médico no pronto-socorro");
  assert.ok(conceitos.some((item) => item.chave === "hospital"));
});

test("autocomplete sugere correção aproximada para erro de digitação", () => {
  const { AutocompleteBusca } = carregar();
  AutocompleteBusca.montarIndice([
    { DESCRICAO: "Bolsonaro concede entrevista", PROGRAMA: "Jornal da Cultura" }
  ]);

  const sugestoes = AutocompleteBusca.obterSugestoes("bolsonro");
  assert.ok(sugestoes.some((item) => item.texto.toLocaleLowerCase("pt-BR") === "bolsonaro"));
  assert.ok(sugestoes.some((item) => item.tipoMatch === "aproximado"));
});


test("associação semântica não vira entidade organizacional falsa", () => {
  const { SearchEngine } = carregar();
  const resultados = SearchEngine.pesquisar([
    { ID: "1452B005030", DESCRICAO: "ALTA NO PREÇO DO COMBUSTÍVEL", PROGRAMA: "Jornal da Cultura" }
  ], "Petrobras");

  assert.equal(resultados.length, 1, "relação semântica com combustível pode manter o resultado");
  assert.equal(
    resultados[0]._SEARCH_ENTITIES.some((item) => item.tipo === "organizacao"),
    false,
    "entidade deve exigir evidência direta da organização"
  );
});
