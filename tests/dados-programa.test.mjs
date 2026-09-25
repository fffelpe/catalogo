import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const dadosPath = fileURLToPath(new URL("../js/dados.js", import.meta.url));

function carregarDadosMedia() {
  const sandbox = {
    console,
    URL,
    document: { currentScript: null },
    window: {
      location: {
        href: "https://catalogo.tvcultura.com.br/pages/programa.html",
        pathname: "/pages/programa.html"
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(dadosPath, "utf8") + "\nglobalThis.__DadosMedia = DadosMedia;",
    sandbox
  );
  return sandbox.__DadosMedia;
}

test("buscarPorPrograma aceita nome já decodificado contendo porcentagem", () => {
  const DadosMedia = carregarDadosMedia();
  DadosMedia.registros = [
    { ID: "1452B000001", PROGRAMA: "100% Cultura", DESCRICAO: "Teste" },
    { ID: "1452B000002", PROGRAMA: "Outro", DESCRICAO: "Teste" }
  ];

  assert.doesNotThrow(() => DadosMedia.buscarPorPrograma("100% Cultura", ""));
  const resultados = DadosMedia.buscarPorPrograma("100% Cultura", "");
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].ID, "1452B000001");
});
