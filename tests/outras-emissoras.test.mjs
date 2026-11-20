import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { criarSnapshot, idValido, pesquisar } from "../js/outras-emissoras-data.js";

test("inclui abas vazias e novas emissoras", () => {
  const dados = criarSnapshot([{nome:"CNN",linhas:[]},{nome:"TV Nova",linhas:[["1234B000001","Imagem","20/11/2026"]]}]);
  assert.deepEqual(dados.emissoras[0],{nome:"CNN",registros:[]});
  assert.equal(dados.emissoras[1].registros[0].ID,"1234B000001");
});
test("mantém conteúdo sem ID, descarta apenas linhas vazias", () => {
  const dados = criarSnapshot([{nome:"REDE TV",linhas:[["","Caso Ana Elisa","09/11/2026"],["","",""]]}]);
  assert.equal(dados.emissoras[0].registros.length,1);
  assert.equal(dados.emissoras[0].registros[0].ID,"");
  assert.equal(idValido(""),false);
  assert.equal(idValido("../arquivo"),false);
  assert.equal(idValido("2457b018658"),true);
});
test("permite pesquisar descrição, data e ID sem depender de acentos", () => {
  const itens=[{ID:"2457B018672",IMAGEM:"Operação Refit",DATA:"11/11/2026"}];
  assert.equal(pesquisar(itens,"operacao").length,1);
  assert.equal(pesquisar(itens,"018672").length,1);
  assert.equal(pesquisar(itens,"11/11").length,1);
  assert.equal(pesquisar(itens,"inexistente").length,0);
});
test("snapshot publicado possui estrutura válida mesmo após atualizações da planilha", () => {
  const dados=JSON.parse(fs.readFileSync(new URL("../data/outras-emissoras.json",import.meta.url),"utf8"));
  assert.equal(dados.schemaVersion,1);
  assert.ok(Array.isArray(dados.emissoras));
  assert.equal(dados.fonte.spreadsheetId,"194DqGYvEiFug_S0Vf5GC2WSlGG79vCX2CMTqrCmPugs");
  for (const emissora of dados.emissoras) {
    assert.equal(typeof emissora.nome,"string");
    assert.ok(emissora.nome.trim());
    assert.ok(Array.isArray(emissora.registros));
    for (const item of emissora.registros) {
      for (const campo of ["ID","IMAGEM","DATA"]) assert.equal(typeof item[campo],"string");
    }
  }
});
