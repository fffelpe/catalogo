import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SINCRONIZACAO = new URL("../scripts/sincronizar-planilhas.mjs", import.meta.url);
const INTEGRACAO_AGRO = new URL("../scripts/sincronizar-noticias-agrocultura.mjs", import.meta.url);

test("grava linhas com Media ID usando RAW para preservar IDs da família E", async () => {
  const [sincronizacao, integracao] = await Promise.all([
    readFile(SINCRONIZACAO, "utf8"),
    readFile(INTEGRACAO_AGRO, "utf8"),
  ]);

  assert.match(sincronizacao, /valueInputOption:\s*["']RAW["']/);
  assert.doesNotMatch(
    sincronizacao,
    /spreadsheetId:\s*PLANILHA_IMGS_ID[\s\S]{0,500}?valueInputOption:\s*["']USER_ENTERED["']/
  );

  assert.match(integracao, /valueInputOption:\s*["']RAW["']/);
  assert.doesNotMatch(
    integracao,
    /spreadsheetId:\s*PLANILHA_IMGS_ID[\s\S]{0,500}?valueInputOption:\s*["']USER_ENTERED["']/
  );
});
