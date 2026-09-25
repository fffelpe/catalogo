import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const paths = {
  mediaId: fileURLToPath(new URL("../js/media-id.js", import.meta.url)),
  enrichment: fileURLToPath(new URL("../js/media-enrichment.js", import.meta.url)),
  segments: fileURLToPath(new URL("../js/media-segments.js", import.meta.url)),
  search: fileURLToPath(new URL("../js/search-engine.js", import.meta.url))
};

function carregar() {
  const sandbox = { console, URL, fetch: async () => ({ ok: true, json: async () => ({ schemaVersion: 1, items: {} }) }) };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(paths.mediaId, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(paths.enrichment, "utf8") + "\nglobalThis.MediaEnrichment = MediaEnrichment;", sandbox);
  vm.runInContext(fs.readFileSync(paths.segments, "utf8") + "\nglobalThis.MediaSegments = MediaSegments;", sandbox);
  vm.runInContext(fs.readFileSync(paths.search, "utf8") + "\nglobalThis.__SearchEngine = SearchEngine;", sandbox);
  return sandbox;
}

test("registro entra no ranking quando consulta existe apenas no segmento", () => {
  const { MediaEnrichment, __SearchEngine: SearchEngine } = carregar();
  MediaEnrichment._definirParaTeste({
    "1452B004869": {
      segments: [{ start: 28, end: 46, text: "Bombeiros auxiliam moradores durante enchente" }]
    }
  });

  const resultados = SearchEngine.pesquisar([
    {
      ID: "1452B004869",
      DESCRICAO: "Chuva em São Paulo",
      DATA: "10/02/2023",
      PROGRAMA: "Jornal da Cultura"
    }
  ], "bombeiros enchente");

  assert.equal(resultados.length, 1);
  assert.equal(resultados[0]._SEARCH_SEGMENT_MATCHES[0].start, 28);
});

test("metadados enriquecidos participam do score sem reduzir prioridade de ID exato", () => {
  const { MediaEnrichment, __SearchEngine: SearchEngine } = carregar();
  MediaEnrichment._definirParaTeste({
    "1452B004869": { keywords: ["chuva", "alagamento"], subjects: ["enchente"] }
  });

  const registro = { ID: "1452B004869", DESCRICAO: "Arquivo", DATA: "10/02/2023", PROGRAMA: "JC" };
  const porTema = SearchEngine.calcularRelevancia(registro, "enchente");
  const porId = SearchEngine.calcularRelevancia(registro, "1452B004869");

  assert.ok(porTema.score > 0);
  assert.equal(porId.score, 10000);
});
