import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { gerarIndiceBuscaEnriquecimento } from "../scripts/indice-busca-enriquecimento.mjs";

const origem = { schemaVersion: 1, generatedAt: "2026-10-19T19:00:00Z", items: {
  "1452B005465": {
    title: "Frango exportado", keywords: ["frango", "exportação"],
    subjects: ["agro"], people: ["Samuel Rocha"], places: ["Paraná"],
    organizations: ["C.Vale"], segments: [{ start: 18, end: 32, text: "Avicultura brasileira" }],
    manualKeywords: ["termo editorial"], manualTitle: ""
  }
} };

test("projeção guarda campos de pesquisa, título e timecodes, sem metadados manuais duplicados", () => {
  const indice = gerarIndiceBuscaEnriquecimento(origem);
  assert.equal(indice.items["1452B005465"][0], "Frango exportado");
  assert.deepEqual(indice.items["1452B005465"][1], ["frango", "exportação"]);
  assert.equal(indice.items["1452B005465"][6][0].start, 18);
  assert.ok(JSON.stringify(indice).length < JSON.stringify(origem).length);
});

function moduloComFetch(fetch) {
  const ctx = { console, URL, fetch };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL("../js/media-enrichment.js", import.meta.url), "utf8") +
    "\nglobalThis.exposto = MediaEnrichment;", ctx);
  return ctx.exposto;
}

test("busca carrega índice leve e ficha carrega o integral apenas sob demanda", async () => {
  const projecao = gerarIndiceBuscaEnriquecimento(origem);
  const requisicoes = [];
  const modulo = moduloComFetch(async (url) => {
    requisicoes.push(url);
    return { ok: true, json: async () => url.includes("media-search-index") ? projecao : origem };
  });
  await modulo.carregar();
  assert.equal(requisicoes.length, 1);
  assert.equal(modulo.obter("1452B005465").title, "Frango exportado");
  assert.equal(modulo.camposPesquisa("1452B005465").SEGMENTS, "Avicultura brasileira");
  await modulo.carregarDetalhes();
  assert.equal(requisicoes.length, 2);
  assert.equal(modulo.obter("1452B005465").manualTitle, "");
  assert.equal(modulo.obter("1452B005465").segments[0].start, 18);
});

test("fallback para enriquecimento integral quando índice leve não existe", async () => {
  const requisicoes = [];
  const modulo = moduloComFetch(async (url) => {
    requisicoes.push(url);
    return url.includes("media-search-index")
      ? { ok: false, status: 404 }
      : { ok: true, json: async () => origem };
  });
  await modulo.carregar();
  assert.equal(requisicoes.length, 2);
  assert.equal(modulo.camposPesquisa("1452B005465").KEYWORDS, "frango exportação");
});
