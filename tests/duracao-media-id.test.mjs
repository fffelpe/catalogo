import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const dadosPath = fileURLToPath(new URL("../js/dados.js", import.meta.url));

function carregarDadosMedia() {
  const sandbox = {
    console,
    window: { location: { href: "http://catalogo.test/pages/media.html", pathname: "/pages/media.html" } },
    document: { currentScript: { src: "http://catalogo.test/js/dados.js" } },
    URL,
    fetch: undefined,
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;",
    sandbox
  );
  vm.runInContext(
    fs.readFileSync(dadosPath, "utf8") + "\nglobalThis.__DadosMedia = DadosMedia;",
    sandbox
  );
  return sandbox.__DadosMedia;
}

test("buscarPorMediaId resolve a duração exata em registro com múltiplos IDs", () => {
  const dados = carregarDadosMedia();
  dados._aplicarRegistros([
    {
      ID: "1452B004869 / 1452B004870",
      DESCRICAO: "Registro com dois IDs",
      DATA: "25/09/2026",
      PROGRAMA: "Jornal da Cultura",
      DURACOES: {
        "1452B004869": "00:03:21",
        "1452B004870": "00:00:42",
      },
    },
  ]);

  assert.equal(dados.buscarPorMediaId("1452B004869").DURACAO, "00:03:21");
  assert.equal(dados.buscarPorMediaId("1452B004870").DURACAO, "00:00:42");
});

test("buscarPorMediaId mantém duração vazia quando a fonte não possui valor", () => {
  const dados = carregarDadosMedia();
  dados._aplicarRegistros([
    {
      ID: "1452B004871",
      DESCRICAO: "Sem duração cadastrada",
      DATA: "25/09/2026",
      PROGRAMA: "Jornal da Cultura",
      DURACOES: {},
    },
  ]);

  assert.equal(dados.buscarPorMediaId("1452B004871").DURACAO, "");
});
