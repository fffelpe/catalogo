import test from "node:test";
import assert from "node:assert/strict";
import { podeReutilizarCredito } from "../scripts/creditos-cache.mjs";

const arquivo = {
  id: "drive-1", name: "1452B004869 - OFICIAL.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  modifiedTime: "2026-10-19T15:00:00.000Z"
};
const anterior = {
  textoCompleto: "Repórter: Maria",
  arquivo: {
    id: arquivo.id, nome: arquivo.name,
    mimeType: arquivo.mimeType, atualizadoEm: arquivo.modifiedTime
  },
  selecao: { tipo: "oficial" }
};

test("reutiliza crédito apenas quando conteúdo e seleção seguem inalterados", () => {
  assert.equal(podeReutilizarCredito(arquivo, anterior, "oficial"), true);
  assert.equal(podeReutilizarCredito({ ...arquivo, modifiedTime: "2026-10-19T16:00:00Z" }, anterior, "oficial"), false);
  assert.equal(podeReutilizarCredito({ ...arquivo, id: "drive-2" }, anterior, "oficial"), false);
  assert.equal(podeReutilizarCredito({ ...arquivo, name: "1452B004869.docx" }, anterior, "oficial"), false);
  assert.equal(podeReutilizarCredito(arquivo, anterior, "unico"), false);
});

test("nunca reutiliza extração vazia, sem metadados ou documento recém-criado", () => {
  assert.equal(podeReutilizarCredito(arquivo, null, "oficial"), false);
  assert.equal(podeReutilizarCredito(arquivo, { ...anterior, textoCompleto: "" }, "oficial"), false);
  assert.equal(podeReutilizarCredito({ ...arquivo, modifiedTime: "" }, anterior, "oficial"), false);
});
