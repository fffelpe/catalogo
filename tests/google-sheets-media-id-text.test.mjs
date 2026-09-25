import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const PREPARACAO = new URL("../scripts/preparar-colunas-media-id.mjs", import.meta.url);
const PACKAGE = new URL("../package.json", import.meta.url);

test("configura a coluna A como texto antes de sincronizar Media IDs", async () => {
  const [preparacao, packageJson] = await Promise.all([
    readFile(PREPARACAO, "utf8"),
    readFile(PACKAGE, "utf8"),
  ]);

  assert.match(preparacao, /numberFormat:\s*\{\s*type:\s*["']TEXT["']/s);
  assert.match(preparacao, /startColumnIndex:\s*0/);
  assert.match(preparacao, /endColumnIndex:\s*1/);

  const pkg = JSON.parse(packageJson);
  assert.match(pkg.scripts["sync:planilhas"], /preparar-colunas-media-id\.mjs/);
  assert.ok(
    pkg.scripts["sync:planilhas"].indexOf("preparar-colunas-media-id.mjs") <
      pkg.scripts["sync:planilhas"].indexOf("sincronizar-planilhas.mjs"),
    "a coluna deve ser preparada antes de qualquer escrita de sincronização"
  );
});
