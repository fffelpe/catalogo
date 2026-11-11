import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

function carregar() {
  const arquivo = fileURLToPath(new URL("../js/autocomplete.js", import.meta.url));
  const contexto = { console };
  vm.createContext(contexto);
  vm.runInContext(fs.readFileSync(arquivo, "utf8") + "\nglobalThis.AutocompleteBusca = AutocompleteBusca;", contexto);
  return contexto.AutocompleteBusca;
}

test("autocomplete indexado preserva sugestões diretas, frases e erros de digitação", () => {
  const busca = carregar();
  busca.montarIndice([
    { DESCRICAO: "Avenida Paulista com trânsito e ônibus", LOCAL: "São Paulo", PROGRAMA: "Jornal da Cultura" },
    { DESCRICAO: "Bolsonaro concede entrevista", LOCAL: "Brasília" },
    { DESCRICAO: "Hospital recebe pacientes", LOCAL: "Santos" }
  ]);
  assert.ok(busca.obterSugestoes("paul").some((item) => item.texto === "Paulista"));
  assert.ok(busca.obterSugestoes("sao pa").some((item) => item.texto === "São Paulo"));
  assert.ok(busca.obterSugestoes("bolsonro").some((item) => item.texto === "Bolsonaro" && item.tipoMatch === "aproximado"));
  assert.ok(busca.obterSugestoes("pacient").some((item) => item.texto === "pacientes"));
  assert.equal(busca.obterSugestoes("zzzzz").length, 0);
});

test("autocomplete atualiza índices ao trocar o acervo", () => {
  const busca = carregar();
  busca.montarIndice([{ DESCRICAO: "Eleição e candidatos" }]);
  assert.ok(busca.obterSugestoes("elei").length > 0);
  busca.montarIndice([{ DESCRICAO: "Desmatamento" }]);
  assert.ok(busca.obterSugestoes("desmat").length > 0);
  assert.equal(busca.obterSugestoes("elei").length, 0);
});
