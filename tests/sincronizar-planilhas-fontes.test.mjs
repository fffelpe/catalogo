import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SCRIPT = new URL("../scripts/sincronizar-planilhas.mjs", import.meta.url);

test("inclui De Olho no Voto como fonte permanente de sincronização", async () => {
  const conteudo = await readFile(SCRIPT, "utf8");

  assert.match(conteudo, /nome:\s*["']De Olho no Voto["']/);
  assert.match(conteudo, /spreadsheetId:\s*["']1R6vI1r78DoXykV_5oGu_uVq1MVf6lmpEx_XZ8eM1Lbs["']/);
  assert.match(conteudo, /range:\s*["']Página1!A2:H["']/);
});
