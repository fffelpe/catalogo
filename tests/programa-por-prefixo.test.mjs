import test from "node:test";
import assert from "node:assert/strict";
import { programaPorMediaId, normalizarMediaId } from "../scripts/programa-por-prefixo.mjs";

test("normaliza a letra do Media ID para maiúscula", () => {
  assert.equal(normalizarMediaId("2370e001234"), "2370E001234");
  assert.equal(normalizarMediaId(" 1452b004318 "), "1452B004318");
});

test("identifica o programa pelos prefixos conhecidos", () => {
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
