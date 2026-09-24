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
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(qualityPath, "utf8"), sandbox);
  vm.runInContext("globalThis.__CatalogoQuality = CatalogoQuality;", sandbox);
  return sandbox.__CatalogoQuality;
}

function porCodigo(problemas, codigo) {
  return problemas.find((item) => item.codigo === codigo);
}

test("classifica campos editoriais ausentes sem transformar opcionais em críticos", () => {
  const CatalogoQuality = carregar();
  const resultado = CatalogoQuality.avaliarRegistro({
    ID: "1452B004869",
    DESCRICAO: "",
    DATA: "10/02/2023",
    LOCAL: "",
    REPORTER: "",
    PROGRAMA: "Jornal da Cultura"
  }, { creditosStatus: "not-loaded" });

  assert.equal(porCodigo(resultado.problemas, "DESCRICAO_AUSENTE").severidade, "warning");
  assert.equal(porCodigo(resultado.problemas, "LOCAL_AUSENTE").severidade, "warning");
  assert.equal(porCodigo(resultado.problemas, "REPORTER_AUSENTE").severidade, "warning");
  assert.equal(porCodigo(resultado.problemas, "SEM_SEGMENTOS").severidade, "info");
});

test("créditos ausentes só são informados quando a fonte foi carregada", () => {
  const CatalogoQuality = carregar();
  const registro = {
    ID: "1452B004869",
    DESCRICAO: "Chuva forte",
    DATA: "10/02/2023",
    LOCAL: "São Paulo",
    REPORTER: "Ana Paula",
    PROGRAMA: "Jornal da Cultura"
  };

  const falhou = CatalogoQuality.avaliarRegistro(registro, {
    creditosStatus: "failed",
    temCreditos: () => false,
    temSegmentos: () => true
  });
  const carregado = CatalogoQuality.avaliarRegistro(registro, {
    creditosStatus: "loaded",
    temCreditos: () => false,
    temSegmentos: () => true
  });

  assert.equal(porCodigo(falhou.problemas, "CREDITOS_AUSENTES"), undefined);
  assert.equal(porCodigo(carregado.problemas, "CREDITOS_AUSENTES").severidade, "info");
});

test("detecta duplicidade por Media ID mesmo quando a célula contém IDs adicionais", () => {
  const CatalogoQuality = carregar();
  const registros = [
    {
      ID: "1452B004869",
      DESCRICAO: "Registro A",
      DATA: "10/02/2023",
      LOCAL: "São Paulo",
      REPORTER: "",
      PROGRAMA: "Jornal da Cultura"
    },
    {
      ID: "1452B004869 / 1452B004870",
      DESCRICAO: "Registro B",
      DATA: "11/02/2023",
      LOCAL: "São Paulo",
      REPORTER: "",
      PROGRAMA: "Jornal da Cultura"
    }
  ];

  const relatorio = CatalogoQuality.avaliarAcervo(registros, {
    creditosStatus: "not-loaded",
    temSegmentos: () => true
  });

  assert.equal(relatorio.length, 2);
  assert.ok(relatorio.every((item) => porCodigo(item.problemas, "ID_DUPLICADO")?.severidade === "critical"));
  assert.ok(relatorio.every((item) => porCodigo(item.problemas, "ID_DUPLICADO")?.mediaIds.includes("1452B004869")));
});

test("marca ID inválido, programa ausente e data inválida com severidades previstas", () => {
  const CatalogoQuality = carregar();
  const resultado = CatalogoQuality.avaliarRegistro({
    ID: "ID ERRADO",
    DESCRICAO: "Teste",
    DATA: "31/02/2023",
    LOCAL: "São Paulo",
    REPORTER: "",
    PROGRAMA: ""
  }, { creditosStatus: "not-loaded" });

  assert.equal(porCodigo(resultado.problemas, "ID_INVALIDO").severidade, "critical");
  assert.equal(porCodigo(resultado.problemas, "PROGRAMA_AUSENTE").severidade, "critical");
  assert.equal(porCodigo(resultado.problemas, "DATA_INVALIDA").severidade, "warning");
});

test("resume total, severidades, registros sem críticos e contagem por problema", () => {
  const CatalogoQuality = carregar();
  const relatorio = CatalogoQuality.avaliarAcervo([
    { ID: "1452B004869", DESCRICAO: "OK", DATA: "10/02/2023", LOCAL: "São Paulo", REPORTER: "Ana", PROGRAMA: "JC" },
    { ID: "1452B004870", DESCRICAO: "", DATA: "11/02/2023", LOCAL: "", REPORTER: "", PROGRAMA: "JC" },
    { ID: "INVÁLIDO", DESCRICAO: "Teste", DATA: "12/02/2023", LOCAL: "SP", REPORTER: "", PROGRAMA: "JC" }
  ], {
    creditosStatus: "not-loaded",
    temSegmentos: () => true
  });

  const resumo = CatalogoQuality.resumir(relatorio);
  assert.equal(resumo.total, 3);
  assert.equal(resumo.noCritical, 2);
  assert.equal(resumo.critical, 1);
  assert.ok(resumo.warning >= 1);
  assert.equal(resumo.byProblem.ID_INVALIDO, 1);
  assert.equal(resumo.byProblem.DESCRICAO_AUSENTE, 1);
});
