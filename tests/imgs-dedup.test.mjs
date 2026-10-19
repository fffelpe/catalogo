import test from "node:test";
import assert from "node:assert/strict";
import { identificarLinhasDuplicadas } from "../scripts/imgs-dedup.mjs";
import { readFile } from "node:fs/promises";

const modelo = ["1452B005520", "Lavoura de soja", "16/10/2026", "MS", "João", "TVE", "AGROCULTURA", "AGRONEGÓCIO"];

test("não apaga linha com outro PGM apesar de A:H idênticos", () => {
  const linhas = [modelo, [...modelo], [...modelo]];
  assert.deepEqual(identificarLinhasDuplicadas(linhas, ["391", "392", "391"]), [4]);
});

test("preserva IDs sem duplicata e linhas sem ID validado", () => {
  assert.deepEqual(
    identificarLinhasDuplicadas([modelo, ["", ...modelo.slice(1)], ["", ...modelo.slice(1)]], ["", "", ""]),
    []
  );
});

test("sincronizador lê PGM no intervalo completo mas atualiza A:H sem apagá-lo", async () => {
  const codigo = await readFile(new URL("../scripts/sincronizar-planilhas.mjs", import.meta.url), "utf8");
  assert.match(codigo, /RANGE_IMGS\s*=\s*\x60\$\{NOME_ABA_IMGS\}!A2:I\x60/);
  assert.match(codigo, /identificarLinhasDuplicadas\(imgs, pgmPorLinha\)/);
  assert.match(codigo, /range:\s*\x60\$\{NOME_ABA_IMGS\}!A\$\{linha\}:H\$\{linha\}\x60/);
});
