import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { programaPorMediaId, normalizarMediaId } from "../scripts/programa-por-prefixo.mjs";

const SCRIPT = new URL("../scripts/sincronizar-planilhas.mjs", import.meta.url);

test("inclui De Olho no Voto como fonte permanente de sincronização", async () => {
  const conteudo = await readFile(SCRIPT, "utf8");

  assert.match(conteudo, /nome:\s*["']De Olho no Voto["']/);
  assert.match(conteudo, /spreadsheetId:\s*["']1R6vI1r78DoXykV_5oGu_uVq1MVf6lmpEx_XZ8eM1Lbs["']/);
  assert.match(conteudo, /range:\s*["']Página1!A2:H["']/);
});

test("inclui documentos do jornalismo e matérias não exibidas como fontes permanentes", async () => {
  const conteudo = await readFile(SCRIPT, "utf8");

  assert.match(conteudo, /nome:\s*["']Documentos Jornalismo["']/);
  assert.match(conteudo, /nome:\s*["']Matérias que não foram ao ar["']/);
});

test("normaliza Media ID para maiúsculas", () => {
  assert.equal(normalizarMediaId("2370e001234"), "2370E001234");
  assert.equal(normalizarMediaId(" 1452b004318 "), "1452B004318");
});

test("mapeia todos os prefixos conhecidos para o programa correto", () => {
  const casos = new Map([
    ["1452B004318", "AGROCULTURA"],
    ["1452E004318", "AGROCULTURA"],
    ["2457B001234", "JORNAL DA CULTURA"],
    ["1009E001234", "JORNAL DA CULTURA"],
    ["2370B001234", "JORNAL DA CULTURA"],
    ["2458E001234", "JORNAL DA CULTURA"],
    ["2822B001234", "JORNAL DA TARDE"],
    ["3293E001234", "DE OLHO NO VOTO"],
    ["3184B001234", "DE OLHO NO VOTO"],
    ["3027E001234", "DE OLHO NO VOTO"],
    ["2712B001234", "DE OLHO NA EDUCAÇÃO"],
    ["2922E001234", "DOCUMENTÁRIOS"],
    ["0205B001234", "REPÓRTER ECO"],
  ]);

  for (const [id, esperado] of casos) {
    assert.equal(programaPorMediaId(id), esperado, id);
  }
});

test("usa PROGRAMA NAO DEFINIDO quando o prefixo não está mapeado", () => {
  assert.equal(programaPorMediaId("9999B001234"), "PROGRAMA NAO DEFINIDO");
});
