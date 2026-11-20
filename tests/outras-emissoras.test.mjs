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
test("snapshot inicial registra 6 emissoras e 21 conteúdos", () => {
  const dados=JSON.parse(fs.readFileSync(new URL("../data/outras-emissoras.json",import.meta.url),"utf8"));
  assert.equal(dados.emissoras.length,6);
  assert.equal(dados.emissoras.find((a)=>a.nome==="CNN").registros.length,0);
  assert.equal(dados.emissoras.find((a)=>a.nome==="REDE TV").registros.length,2);
  assert.equal(dados.emissoras.reduce((n,a)=>n+a.registros.length,0),21);
});
