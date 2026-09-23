import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dadosPath = fileURLToPath(new URL("../js/dados.js", import.meta.url));
const source = fs.readFileSync(dadosPath, "utf8");

test("dados.js declara o snapshot local como fonte primária", () => {
  assert.match(source, /catalogo-acervo\.json/);
  assert.match(source, /SNAPSHOT_URL/);
  assert.match(source, /fetch\s*\(/);
});

test("dados.js mantém Google Sheets apenas como fallback", () => {
  const posSnapshot = source.indexOf("_carregarSnapshotLocal");
  const posFallback = source.indexOf("_carregarGoogleSheets");

  assert.ok(posSnapshot >= 0, "carregador do snapshot local deve existir");
  assert.ok(posFallback >= 0, "fallback do Google Sheets deve existir");
  assert.ok(posSnapshot < posFallback, "snapshot local deve ser tentado antes do Google Sheets");
});
