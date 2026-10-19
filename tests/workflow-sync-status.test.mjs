import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const wf = fs.readFileSync(".github/workflows/sincronizar-planilhas.yml", "utf8");
test("não estabiliza status horário antes de o script gerá-lo", () => {
  const trecho = wf.match(/node scripts\/estabilizar-snapshots\.mjs[^\n]*/g) || [];
  assert.ok(trecho.length >= 2);
  assert.ok(trecho.every((linha) => !linha.includes("sincronizacao-status.json")));
  assert.ok(wf.includes("node scripts/atualizar-status-sincronizacao.mjs"));
  assert.ok(wf.includes("git add data/catalogo-acervo.json"));
  assert.match(wf, /git add[^\n]*data\/sincronizacao-status\.json/);
});
