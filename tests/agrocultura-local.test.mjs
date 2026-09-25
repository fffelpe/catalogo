import test from "node:test";
import assert from "node:assert/strict";
import { construirIndiceLocais, resolverLocal } from "../scripts/agrocultura-local.mjs";

const extrairIds = (valor) => String(valor ?? "").toUpperCase().match(/\d{4}[A-Z]\d{5,6}/g) || [];

test("preenche o local do VT pelo Media ID, inclusive quando a célula contém vários IDs", () => {
  const indice = construirIndiceLocais([
    ["1452B005412", "descrição", "13/08/2026", "PERNAMBUCO - PE"],
    ["1452B005450 + 1452B005451", "descrição", "27/08/2026", "ESPÍRITO SANTO - ES"],
    ["1452B999999", "descrição", "01/01/2026", ""],
  ], extrairIds);

  assert.equal(resolverLocal(extrairIds("1452B005412"), indice), "PERNAMBUCO - PE");
  assert.equal(resolverLocal(extrairIds("1452B005451"), indice), "ESPÍRITO SANTO - ES");
  assert.equal(resolverLocal(extrairIds("1452B999999"), indice), "");
});
