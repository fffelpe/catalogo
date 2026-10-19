import test from "node:test";
import assert from "node:assert/strict";
import { construirStatusSincronizacao } from "../scripts/atualizar-status-sincronizacao.mjs";
test("separa verificação por hora da última alteração editorial", () => {
  const snapshot = { total: 1, registros: [{ ID: "1452B005465" }], generatedAt: "2026-10-18T21:00:00Z" };
  const agora = new Date("2026-10-19T19:34:29Z");
  const result = construirStatusSincronizacao(snapshot, agora);
  assert.equal(result.ultimaVerificacaoFaixaUTC, "2026-10-19T19:00:00.000Z");
  assert.equal(result.ultimoAcervoAtualizadoEm, "2026-10-18T21:00:00.000Z");
  assert.equal(result.precisaoVerificacao, "hora");
});
test("status rejeita snapshots sem total consistente", () => {
  assert.throws(() => construirStatusSincronizacao({ total: 4, registros: [], generatedAt: "2026-10-19T19:00:00Z" }), /inconsistente/);
});
