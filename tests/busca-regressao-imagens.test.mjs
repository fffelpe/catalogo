import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const fixture = JSON.parse(fs.readFileSync(
  fileURLToPath(new URL("./fixtures/busca-imagens.json", import.meta.url)),
  "utf8"
));

function criarMotor() {
  const sandbox = { console, URL };
  vm.createContext(sandbox);
  for (const [arquivo, nome] of [
    ["media-id.js", "MediaIdUtils"],
    ["sinonimos.js", "VocabularioJornalistico"],
    ["search-engine.js", "SearchEngine"]
  ]) {
    const caminho = fileURLToPath(new URL(`../js/${arquivo}`, import.meta.url));
    vm.runInContext(
      fs.readFileSync(caminho, "utf8") + `\nglobalThis.${nome} = ${nome};`,
      sandbox
    );
  }
  return sandbox.SearchEngine;
}

test("corpus de avaliação possui casos e IDs únicos dentro de cada consulta", () => {
  assert.ok(fixture.casos.length >= 4);
  for (const caso of fixture.casos) {
    assert.ok(caso.consulta && caso.primeiro && Array.isArray(caso.registros));
    const ids = caso.registros.map((registro) => registro.ID);
    assert.equal(new Set(ids).size, ids.length, `Media IDs repetidos em "${caso.nome}"`);
    assert.ok(ids.includes(caso.primeiro), `Primeiro resultado inexistente em "${caso.nome}"`);
    for (const id of [...(caso.incluir || []), ...(caso.excluir || [])]) {
      assert.ok(ids.includes(id), `Media ID ${id} não existe no caso "${caso.nome}"`);
    }
  }
});

for (const caso of fixture.casos) {
  test(`regressão de busca por imagens: ${caso.nome}`, () => {
    const motor = criarMotor();
    const encontrados = motor.pesquisar(caso.registros, caso.consulta);
    const ids = encontrados.map((item) => item.ID);

    assert.equal(ids[0], caso.primeiro,
      `Consulta "${caso.consulta}" deve priorizar a correspondência direta. Encontrados: ${ids.join(", ")}`);
    for (const id of caso.incluir || []) {
      assert.ok(ids.includes(id),
        `Consulta "${caso.consulta}" não encontrou imagem contextual ${id}.`);
    }
    for (const id of caso.excluir || []) {
      assert.ok(!ids.includes(id),
        `Consulta "${caso.consulta}" trouxe imagem irrelevante ${id}.`);
    }
  });
}
