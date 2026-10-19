import test from "node:test";
import assert from "node:assert/strict";
import { compilarRelatorioConflitos } from "../scripts/relatorio-conflitos.mjs";

test("relatório inclui todos os conflitos por fonte, campo e MediaID", () => {
  const resultado = compilarRelatorioConflitos({
    etapa: "fontes",
    geradoEm: "2026-10-19T18:00:00.000Z",
    conflitos: [
      { ids: "1452B005465, 1452B005466", fonte: "Agrocultura", linhaImgs: 22, campo: "DESCRIÇÃO", existente: "Original", recebido: "Outra" },
      { ids: "1452B005465", fonte: "Repórter Eco", linhaImgs: null, campo: "LOCAL", existente: "SP", recebido: "RJ" }
    ]
  });
  assert.equal(resultado.resumo.totalConflitos, 2);
  assert.equal(resultado.resumo.totalMediaIds, 2);
  assert.equal(resultado.resumo.porFonte.Agrocultura, 1);
  assert.equal(resultado.resumo.porCampo.LOCAL, 1);
  assert.equal(resultado.conflitos[0].linhaImgs, 22);
});
test("não inventa divergências quando não existem", () => {
  const resultado = compilarRelatorioConflitos({ etapa: "noticias", conflitos: [] });
  assert.equal(resultado.resumo.totalConflitos, 0);
  assert.deepEqual(resultado.resumo.porFonte, {});
});
