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

test("auditoria identifica campos ausentes sem exigir segmentos de vídeo", () => {
  const CatalogoQuality = carregar();
  const resultado = CatalogoQuality.avaliarRegistro({
    ID: "1452B004869",
    DESCRICAO: "",
    DATA: "10/02/2023",
    PROGRAMA: "Jornal da Cultura",
    LOCAL: "",
    REPORTER: "",
    AFILIADA_EMISSORA: "",
    EDITORIA: ""
  });

  for (const codigo of [
    "DESCRICAO_AUSENTE",
    "LOCAL_AUSENTE",
    "REPORTER_AUSENTE",
    "AFILIADA_AUSENTE",
    "EDITORIA_AUSENTE"
  ]) {
    assert.ok(resultado.problemas.some((p) => p.codigo === codigo && p.severidade === "warning"), codigo);
  }
  assert.equal(resultado.problemas.some((p) => p.codigo === "SEM_SEGMENTOS"), false);
});

test("data ISO impossível é apontada como inválida, data real é aceita", () => {
  const CatalogoQuality = carregar();
  const base = {
    ID: "1452B004869",
    DESCRICAO: "Pessoas na feira",
    PROGRAMA: "AGROCULTURA",
    REPORTER: "ANA LIMA",
    LOCAL: "SÃO PAULO - SP",
    AFILIADA_EMISSORA: "TV CULTURA / SP",
    EDITORIA: "COTIDIANO"
  };
  const invalida = CatalogoQuality.avaliarRegistro({ ...base, DATA: "2026-02-30" });
  const valida = CatalogoQuality.avaliarRegistro({ ...base, DATA: "2026-02-28" });
  assert.equal(invalida.problemas.some((p) => p.codigo === "DATA_INVALIDA"), true);
  assert.equal(valida.problemas.some((p) => p.codigo === "DATA_INVALIDA"), false);
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
