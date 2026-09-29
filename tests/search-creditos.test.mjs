import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const paths = {
  mediaId: fileURLToPath(new URL("../js/media-id.js", import.meta.url)),
  creditos: fileURLToPath(new URL("../js/creditos.js", import.meta.url)),
  search: fileURLToPath(new URL("../js/search-engine.js", import.meta.url)),
};

function carregar() {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(paths.mediaId, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;",
    sandbox
  );
  vm.runInContext(
    fs.readFileSync(paths.creditos, "utf8") + "\nglobalThis.CreditosMedia = CreditosMedia;",
    sandbox
  );
  vm.runInContext(
    fs.readFileSync(paths.search, "utf8") + "\nglobalThis.__SearchEngine = SearchEngine;",
    sandbox
  );
  return sandbox;
}

test("busca encontra Media ID por termo presente apenas no texto completo do documento de créditos", () => {
  const { CreditosMedia, __SearchEngine: SearchEngine } = carregar();
  CreditosMedia.registros = {
    "1452B005485": {
      materia: "Arquivo",
      fontes: [],
      creditos: {},
      textoCompleto: "Imagens gravadas no bairro Beloto em Andradas durante a florada do café",
    },
  };
  CreditosMedia.carregado = true;

  const resultados = SearchEngine.pesquisar([
    {
      ID: "1452B005485",
      DESCRICAO: "Plantação de café",
      DATA: "25/09/2026",
      PROGRAMA: "Agrocultura",
    },
  ], "bairro Beloto");

  assert.equal(resultados.length, 1);
  assert.ok(resultados[0]._SEARCH_SCORE > 0);
  assert.equal(
    resultados[0]._SEARCH_MATCHES.some((match) => match.campo === "CREDITOS_TEXTO"),
    true
  );
});
