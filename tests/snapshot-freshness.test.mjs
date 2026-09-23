import test from "node:test";
import assert from "node:assert/strict";
import { avaliarFrescorSnapshot } from "../scripts/snapshot-freshness.mjs";

test("aceita snapshot recente e informa idade e ultima sincronizacao", () => {
  const resultado = avaliarFrescorSnapshot(
    { generatedAt: "2026-09-23T18:50:00.000Z" },
    { agora: "2026-09-23T19:00:00.000Z", limiteMinutos: 20 }
  );

  assert.equal(resultado.ok, true);
  assert.equal(resultado.idadeMinutos, 10);
  assert.equal(resultado.ultimaSincronizacao, "2026-09-23T18:50:00.000Z");
});

test("rejeita snapshot mais antigo que o limite", () => {
  const resultado = avaliarFrescorSnapshot(
    { generatedAt: "2026-09-23T18:30:00.000Z" },
    { agora: "2026-09-23T19:00:00.000Z", limiteMinutos: 20 }
  );

  assert.equal(resultado.ok, false);
  assert.equal(resultado.idadeMinutos, 30);
  assert.match(resultado.motivo, /excedeu o limite/i);
});

test("rejeita generatedAt ausente ou invalido", () => {
  assert.equal(
    avaliarFrescorSnapshot({}, { agora: "2026-09-23T19:00:00.000Z" }).ok,
    false
  );

  assert.equal(
    avaliarFrescorSnapshot(
      { generatedAt: "valor-invalido" },
      { agora: "2026-09-23T19:00:00.000Z" }
    ).ok,
    false
  );
});
