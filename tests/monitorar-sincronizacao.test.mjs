import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const workflow = fs.readFileSync(".github/workflows/monitorar-sincronizacao.yml", "utf8");
test("monitor verifica falha das três automações e atraso da principal", () => {
  for (const nome of ["Sincronizar planilhas do catálogo", "Sincronizar créditos", "Deploy catálogo no GitHub Pages"]) {
    assert.ok(workflow.includes(nome));
  }
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /idadeHoras > 3/);
  assert.match(workflow, /issues\.update/);
  assert.match(workflow, /issues\.create/);
});
