import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const qualityPath = fileURLToPath(new URL("../js/catalogo-quality.js", import.meta.url));

function carregar() {
  assert.ok(fs.existsSync(qualityPath), "catalogo-quality.js deve existir");
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(qualityPath, "utf8") + "\nglobalThis.__CatalogoQuality = CatalogoQuality;", sandbox);
  return sandbox.__CatalogoQuality;
}

test("descrição ausente é warning e segmento ausente é info", () => {
  const CatalogoQuality = carregar();
  const resultado = CatalogoQuality.avaliarRegistro({
    ID: "1452B004869",
    DESCRICAO: "",
    DATA: "10/02/2023",
    PROGRAMA: "Jornal da Cultura",
    LOCAL: "",
    REPORTER: ""
  }, { enrichment: {} });

  assert.ok(resultado.problemas.some((p) => p.codigo === "DESCRICAO_AUSENTE" && p.severidade === "warning"));
  assert.ok(resultado.problemas.some((p) => p.codigo === "SEM_SEGMENTOS" && p.severidade === "info"));
});

test("detecta ID duplicado mesmo dentro de célula com múltiplos IDs", () => {
  const CatalogoQuality = carregar();
  const relatorio = CatalogoQuality.avaliarAcervo([
    { ID: "1452B004869", DESCRICAO: "A", DATA: "10/02/2023", PROGRAMA: "JC" },
    { ID: "1452B004869 / 1452B004870", DESCRICAO: "B", DATA: "10/02/2023", PROGRAMA: "JC" }
  ], {});

  assert.equal(relatorio.duplicados["1452B004869"].length, 2);
});

test("créditos indisponíveis ficam não verificados", () => {
  const CatalogoQuality = carregar();
  const relatorio = CatalogoQuality.avaliarAcervo([
    { ID: "1452B004869", DESCRICAO: "A", DATA: "10/02/2023", PROGRAMA: "JC" }
  ], { creditosCarregados: false });

  assert.equal(relatorio.creditosStatus, "nao_verificado");
  assert.equal(relatorio.registros[0].problemas.some((p) => p.codigo === "CREDITOS_AUSENTES"), false);
});
