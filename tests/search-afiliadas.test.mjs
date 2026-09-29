import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const searchPath = fileURLToPath(new URL("../js/search-engine.js", import.meta.url));

function carregar() {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;",
    sandbox
  );
  vm.runInContext(
    fs.readFileSync(searchPath, "utf8") + "\nglobalThis.__SearchEngine = SearchEngine;",
    sandbox
  );
  return sandbox.__SearchEngine;
}

test("busca encontra material pela cidade enriquecida da afiliada", () => {
  const SearchEngine = carregar();
  const resultados = SearchEngine.pesquisar([
    {
      ID: "1452B005485",
      DESCRICAO: "Arquivo",
      PROGRAMA: "Agrocultura",
      _AFILIADA_CIDADE: "GOIÂNIA",
      _AFILIADA_UF: "GOIÁS - GO",
    },
  ], "Goiânia");

  assert.equal(resultados.length, 1);
  assert.equal(
    resultados[0]._SEARCH_MATCHES.some((match) => match.campo === "_AFILIADA_CIDADE"),
    true
  );
});

test("busca encontra material pela UF enriquecida da afiliada", () => {
  const SearchEngine = carregar();
  const resultados = SearchEngine.pesquisar([
    {
      ID: "1452B005485",
      DESCRICAO: "Arquivo",
      PROGRAMA: "Agrocultura",
      _AFILIADA_CIDADE: "GOIÂNIA",
      _AFILIADA_UF: "GOIÁS - GO",
    },
  ], "Goiás");

  assert.equal(resultados.length, 1);
  assert.equal(
    resultados[0]._SEARCH_MATCHES.some((match) => match.campo === "_AFILIADA_UF"),
    true
  );
});
