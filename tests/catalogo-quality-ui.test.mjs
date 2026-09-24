import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const uiPath = fileURLToPath(new URL("../js/catalogo-quality-ui.js", import.meta.url));

function carregar() {
  assert.ok(fs.existsSync(uiPath), "catalogo-quality-ui.js deve existir");
  const sandbox = {
    console,
    document: { addEventListener() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(uiPath, "utf8"), sandbox);
  vm.runInContext("globalThis.__CatalogoQualityUI = CatalogoQualityUI;", sandbox);
  return sandbox.__CatalogoQualityUI;
}

const relatorio = [
  {
    registro: { ID: "1452B004869", PROGRAMA: "Jornal da Cultura", DESCRICAO: "OK", DATA: "10/02/2023" },
    mediaIds: ["1452B004869"],
    severidadeMaxima: "ok",
    problemas: []
  },
  {
    registro: { ID: "1452B004870", PROGRAMA: "Jornal da Cultura", DESCRICAO: "", DATA: "11/02/2023" },
    mediaIds: ["1452B004870"],
    severidadeMaxima: "warning",
    problemas: [{ codigo: "DESCRICAO_AUSENTE", severidade: "warning", mensagem: "Descrição ausente" }]
  },
  {
    registro: { ID: "1452B004871", PROGRAMA: "Repórter Cultura", DESCRICAO: "Teste", DATA: "12/02/2023" },
    mediaIds: ["1452B004871"],
    severidadeMaxima: "critical",
    problemas: [{ codigo: "ID_DUPLICADO", severidade: "critical", mensagem: "Media ID duplicado" }]
  },
  {
    registro: { ID: "1452B004872", PROGRAMA: "Jornal da Cultura", DESCRICAO: "Teste", DATA: "13/02/2023" },
    mediaIds: ["1452B004872"],
    severidadeMaxima: "info",
    problemas: [{ codigo: "SEM_SEGMENTOS", severidade: "info", mensagem: "Sem segmentos indexados" }]
  }
];

test("filtra simultaneamente por programa, severidade e problema", () => {
  const UI = carregar();

  assert.deepEqual(
    UI.filtrarRelatorio(relatorio, { programa: "Jornal da Cultura", severidade: "warning", problema: "" })
      .map((item) => item.registro.ID),
    ["1452B004870"]
  );

  assert.deepEqual(
    UI.filtrarRelatorio(relatorio, { programa: "", severidade: "", problema: "SEM_SEGMENTOS" })
      .map((item) => item.registro.ID),
    ["1452B004872"]
  );
});

test("filtro de severidade considera a severidade real dos problemas", () => {
  const UI = carregar();
  assert.deepEqual(
    UI.filtrarRelatorio(relatorio, { programa: "", severidade: "critical", problema: "" })
      .map((item) => item.registro.ID),
    ["1452B004871"]
  );
});

test("cria link de ficha usando o primeiro Media ID válido do registro", () => {
  const UI = carregar();
  assert.equal(
    UI.criarUrlMedia({ ID: "1452B004869 / 1452B004870" }),
    "media.html?id=1452B004869"
  );
  assert.equal(UI.criarUrlMedia({ ID: "inválido" }), "");
});

test("paginação mantém no máximo cinquenta registros por página", () => {
  const UI = carregar();
  const lista = Array.from({ length: 121 }, (_, index) => ({ registro: { ID: String(index) } }));
  assert.equal(UI.paginar(lista, 1, 50).itens.length, 50);
  assert.equal(UI.paginar(lista, 3, 50).itens.length, 21);
  assert.equal(UI.paginar(lista, 4, 50).pagina, 3);
});
