import test from "node:test";
import assert from "node:assert/strict";
import { chaveComparacao, mesclarCamposPreservando } from "../scripts/mesclagem-metadados.mjs";

const campos = ["ID", "DESCRIÇÃO", "DATA", "LOCAL", "REPÓRTER", "AFILIADA", "PROGRAMA", "EDITORIA", "PGM"];

test("preenche repórter, afiliada e local quando a linha principal não tem os dados", () => {
  const conflitos = [];
  const principal = ["1452B004869", "Tema", "10/10/2026", "", "", "", "AGROCULTURA", "", ""];
  const fonte = ["1452B004869", "Tema", "10/10/2026", "VITÓRIA - ES", "MARIA SOUZA", "TVE / ES", "AGROCULTURA", "AGRONEGÓCIO", "384"];
  const mesclado = mesclarCamposPreservando(principal, fonte, {
    nomesCampos: campos,
    ate: 9,
    registrarConflito: (conflito) => conflitos.push(conflito),
  });
  assert.equal(mesclado[3], "VITÓRIA - ES");
  assert.equal(mesclado[4], "MARIA SOUZA");
  assert.equal(mesclado[5], "TVE / ES");
  assert.equal(mesclado[7], "AGRONEGÓCIO");
  assert.equal(mesclado[8], "384");
  assert.equal(conflitos.length, 0);
  assert.equal(principal[3], "");
});

test("conflitos preservam os dados existentes e identificam campo e valores", () => {
  const conflitos = [];
  const existente = ["2457B017959", "TESTES FINAIS ROCK IN RIO", "01/09/2026", "RIO DE JANEIRO - RJ"];
  const recebido = ["2457B017959", "REGRAS AUTO PROPELIDOS", "16/09/2026", "PARANÁ - PR"];
  const mesclado = mesclarCamposPreservando(existente, recebido, {
    nomesCampos: campos, ate: 4, registrarConflito: (c) => conflitos.push(c),
  });
  assert.deepEqual(mesclado, existente);
  assert.deepEqual(conflitos.map((c) => c.campo), ["DESCRIÇÃO", "DATA", "LOCAL"]);
  assert.equal(conflitos[0].existente, "TESTES FINAIS ROCK IN RIO");
  assert.equal(conflitos[0].recebido, "REGRAS AUTO PROPELIDOS");
});

test("grafias TVE / ES e TVE - ES não são falsos conflitos", () => {
  const conflitos = [];
  const resultado = mesclarCamposPreservando(["ID", "TVE / ES"], ["ID", "TVE - ES"], {
    ate: 2, registrarConflito: (c) => conflitos.push(c),
  });
  assert.equal(resultado[1], "TVE / ES");
  assert.equal(conflitos.length, 0);
  assert.equal(chaveComparacao("Espírito Santo - ES"), chaveComparacao("ESPIRITO SANTO / ES"));
});

test("não elimina metadados quando a fonte contém células vazias", () => {
  const atual = ["ID", "Descrição original", "10/10/2026", "SÃO PAULO - SP", "ANA LIMA"];
  const resultado = mesclarCamposPreservando(atual, ["ID", "", "", null, undefined]);
  assert.deepEqual(resultado, atual);
});
