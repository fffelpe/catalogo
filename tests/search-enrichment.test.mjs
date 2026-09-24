import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const arquivos = [
  "../js/media-id.js",
  "../js/media-enrichment.js",
  "../js/media-segments.js",
  "../js/search-engine.js"
].map((rel) => fileURLToPath(new URL(rel, import.meta.url)));

async function carregar(payload) {
  assert.ok(fs.existsSync(arquivos[2]), "media-segments.js deve existir");
  const sandbox = {
    console,
    URL,
    fetch: async () => ({ ok: true, json: async () => payload })
  };
  vm.createContext(sandbox);
  for (const arquivo of arquivos) {
    const source = fs.readFileSync(arquivo, "utf8");
    vm.runInContext(source, sandbox);
  }
  vm.runInContext(
    "globalThis.__MediaEnrichment = MediaEnrichment; globalThis.__SearchEngine = SearchEngine;",
    sandbox
  );
  await sandbox.__MediaEnrichment.carregar();
  return sandbox.__SearchEngine;
}

test("termo presente apenas em segmento retorna o registro e o trecho", async () => {
  const SearchEngine = await carregar({
    schemaVersion: 1,
    items: {
      "1452B004869": {
        segments: [{ start: 28, end: 46, text: "Bombeiros auxiliam moradores durante enchente" }]
      }
    }
  });

  const resultados = SearchEngine.pesquisar([
    {
      ID: "1452B004869",
      DESCRICAO: "Imagens gerais da cidade",
      DATA: "10/02/2023",
      LOCAL: "São Paulo",
      REPORTER: "",
      PROGRAMA: "Jornal da Cultura",
      EDITORIA: "Cidades"
    }
  ], "bombeiros");

  assert.equal(resultados.length, 1);
  assert.equal(resultados[0]._SEARCH_SEGMENT_MATCHES[0].mediaId, "1452B004869");
  assert.equal(resultados[0]._SEARCH_SEGMENT_MATCHES[0].start, 28);
});

test("ID exato continua acima de correspondência de enrichment", async () => {
  const SearchEngine = await carregar({
    schemaVersion: 1,
    items: {
      "1452B004870": { keywords: ["1452B004869"] }
    }
  });

  const resultados = SearchEngine.pesquisar([
    { ID: "1452B004870", DESCRICAO: "Outro conteúdo", PROGRAMA: "Jornal da Cultura" },
    { ID: "1452B004869", DESCRICAO: "Conteúdo correto", PROGRAMA: "Jornal da Cultura" }
  ], "1452B004869");

  assert.equal(resultados[0].ID, "1452B004869");
  assert.equal(resultados[0]._SEARCH_SCORE, 10000);
});
