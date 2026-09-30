import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const dadosPath = fileURLToPath(new URL("../js/dados.js", import.meta.url));

function carregarDados() {
  const mediaIdSource = fs.readFileSync(mediaIdPath, "utf8");
  const dadosSource = fs.readFileSync(dadosPath, "utf8");
  const sandbox = { console, URL };
  vm.createContext(sandbox);
  vm.runInContext(`${mediaIdSource}\nglobalThis.MediaIdUtils = MediaIdUtils;`, sandbox);
  vm.runInContext(`${dadosSource}\nglobalThis.__DadosMedia = DadosMedia;`, sandbox);
  return sandbox.__DadosMedia;
}

test("buscarPorMediaId localiza um ID dentro de célula com múltiplos IDs", () => {
  const DadosMedia = carregarDados();
  DadosMedia.registros = [{
    ID: "1452B004869 / 1452B004870",
    DESCRICAO: "Registro editorial compartilhado"
  }];

  assert.equal(
    DadosMedia.buscarPorMediaId("1452B004870")?.DESCRICAO,
    "Registro editorial compartilhado"
  );
});

test("buscarPorMediaId rejeita consulta que não seja Media ID válido", () => {
  const DadosMedia = carregarDados();
  DadosMedia.registros = [{ ID: "1452B004869", DESCRICAO: "Teste" }];
  assert.equal(DadosMedia.buscarPorMediaId("<script>"), null);
});

test("buscarPorMediaId usa o índice criado ao aplicar os registros", () => {
  const DadosMedia = carregarDados();

  DadosMedia._aplicarRegistros([{
    ID: "1452B004869 / 1452B004870",
    DESCRICAO: "Registro indexado",
    DURACOES: {
      "1452B004869": "00:01:00",
      "1452B004870": "00:02:00"
    }
  }]);

  DadosMedia.registros = new Proxy(DadosMedia.registros, {
    get(target, prop, receiver) {
      if (prop === "find") throw new Error("busca linear não deve ser usada");
      return Reflect.get(target, prop, receiver);
    }
  });

  const resultado = DadosMedia.buscarPorMediaId("1452B004870");
  assert.equal(resultado?.DESCRICAO, "Registro indexado");
  assert.equal(resultado?.DURACAO, "00:02:00");
});
