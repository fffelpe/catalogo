import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const arquivo = fileURLToPath(new URL("../js/media-enrichment.js", import.meta.url));

function carregarModulo() {
  assert.ok(fs.existsSync(arquivo), "media-enrichment.js deve existir");
  const source = fs.readFileSync(arquivo, "utf8");
  const sandbox = { console, URL, fetch: async () => ({ ok: true, json: async () => ({ schemaVersion: 1, items: {} }) }) };
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nglobalThis.__MediaEnrichment = MediaEnrichment;`, sandbox);
  return sandbox.__MediaEnrichment;
}

test("normaliza segmentos válidos e ignora segmentos inválidos", () => {
  const MediaEnrichment = carregarModulo();
  const item = MediaEnrichment.normalizarItem({
    keywords: [" chuva ", ""],
    subjects: ["enchente"],
    segments: [
      { start: 28, end: 46, text: "Bombeiros auxiliam moradores" },
      { start: -1, end: 4, text: "inválido" },
      { start: 50, end: 40, text: "inválido" },
      { start: 60, end: 70, text: "   " }
    ]
  });

  assert.deepEqual(JSON.parse(JSON.stringify(item.segments)), [
    { start: 28, end: 46, text: "Bombeiros auxiliam moradores" }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(item.keywords)), ["chuva"]);
});

test("camposPesquisa agrega campos enriquecidos em texto pesquisável", () => {
  const MediaEnrichment = carregarModulo();
  MediaEnrichment._definirParaTeste({
    "1452B004869": {
      keywords: ["chuva", "alagamento"],
      subjects: ["enchente"],
      places: ["São Paulo"],
      segments: [{ start: 28, text: "Bombeiros auxiliam moradores" }]
    }
  });

  assert.deepEqual(JSON.parse(JSON.stringify(MediaEnrichment.camposPesquisa("1452B004869"))), {
    KEYWORDS: "chuva alagamento",
    SUBJECTS: "enchente",
    PEOPLE: "",
    PLACES: "São Paulo",
    SEGMENTS: "Bombeiros auxiliam moradores"
  });
});
