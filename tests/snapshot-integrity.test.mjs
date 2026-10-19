import test from "node:test";
import assert from "node:assert/strict";
import { validarRegressaoSnapshot } from "../scripts/snapshot-integrity.mjs";

function snapshot(ids = 10, comDuracao = ids) {
  const registros = Array.from({ length: ids }, (_, i) => ({
    ID: `1452B${String(i).padStart(6, "0")}`,
    DURACOES: i < comDuracao ? { [`1452B${String(i).padStart(6, "0")}`]: "00:01:00" } : {}
  }));
  return { total: registros.length, registros };
}

test("aceita snapshot inaugural e pequenas alterações legítimas", () => {
  assert.equal(validarRegressaoSnapshot(snapshot(10), null).comparado, false);
  assert.equal(validarRegressaoSnapshot(snapshot(9), snapshot(10), { minimoBase: 5 }).total, 9);
});

test("impede queda abrupta do catálogo antes da publicação", () => {
  assert.throws(
    () => validarRegressaoSnapshot(snapshot(7), snapshot(10), { minimoBase: 5 }),
    /Queda abrupta no acervo/
  );
});

test("impede perda maciça de durações mesmo com todos os Media IDs presentes", () => {
  assert.throws(
    () => validarRegressaoSnapshot(snapshot(10, 1), snapshot(10, 10), { minimoBase: 5 }),
    /Queda abrupta nas durações/
  );
});

test("recusa snapshots estruturalmente inconsistentes", () => {
  assert.throws(() => validarRegressaoSnapshot({ total: 4, registros: [{}] }), /inconsistente/);
  assert.throws(() => validarRegressaoSnapshot(snapshot(10), { total: 3, registros: [{}] }), /anterior inválido/);
});
