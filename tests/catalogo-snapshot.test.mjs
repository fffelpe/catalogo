import test from "node:test";
import assert from "node:assert/strict";
import { criarSnapshotCatalogo } from "../scripts/catalogo-snapshot.mjs";

test("cria snapshot do catálogo com as colunas públicas e ignora linhas sem ID", () => {
  const linhas = [
    [
      "1452B004869",
      " Colheita de soja ",
      "09/09/2026",
      " São Paulo ",
      " Repórter Teste ",
      " TV Cultura ",
      " Agrocultura ",
      " Agronegócio ",
      "381",
    ],
    ["", "linha sem ID", "09/09/2026", "", "", "", "", "", "999"],
    [
      "1009B064438",
      "Economia",
      "08/09/2026",
      "Brasília",
      "Outro Repórter",
      "TV Cultura",
      "Jornal da Cultura",
      "Economia",
      "",
    ],
  ];

  const snapshot = criarSnapshotCatalogo(linhas, {
    generatedAt: "2026-09-23T18:00:00.000Z",
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.generatedAt, "2026-09-23T18:00:00.000Z");
  assert.equal(snapshot.total, 2);
  assert.deepEqual(snapshot.registros, [
    {
      ID: "1452B004869",
      DESCRICAO: "Colheita de soja",
      DATA: "09/09/2026",
      LOCAL: "São Paulo",
      REPORTER: "Repórter Teste",
      AFILIADA_EMISSORA: "TV Cultura",
      PROGRAMA: "Agrocultura",
      EDITORIA: "Agronegócio",
      PGM: "381",
    },
    {
      ID: "1009B064438",
      DESCRICAO: "Economia",
      DATA: "08/09/2026",
      LOCAL: "Brasília",
      REPORTER: "Outro Repórter",
      AFILIADA_EMISSORA: "TV Cultura",
      PROGRAMA: "Jornal da Cultura",
      EDITORIA: "Economia",
      PGM: "",
    },
  ]);
});

test("recusa publicar snapshot vazio para não substituir o acervo por acidente", () => {
  assert.throws(
    () => criarSnapshotCatalogo([["", "sem ID"]]),
    /nenhum registro válido/i
  );
});
