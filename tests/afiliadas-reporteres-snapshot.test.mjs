import test from "node:test";
import assert from "node:assert/strict";
import { criarSnapshotAfiliadasReporteres } from "../scripts/afiliadas-reporteres-snapshot.mjs";

const afiliadas = [
  ["AFL001", "TV BRASIL CENTRAL", "GOIÁS - GO", "GOIÂNIA", "SIM"],
  ["AFL002", "TV REDE MINAS", "MINAS GERAIS - MG", "", "NÃO"],
];

const reporteres = [
  ["REP001", "LUIZA MORAES", "AFL001", "REPÓRTER", "SIM"],
  ["REP002", "LUCIANO TEIXEIRA", "AFL002", "REPÓRTER", "NÃO"],
];

test("gera snapshot com cidade, UF e status das afiliadas", () => {
  const snapshot = criarSnapshotAfiliadasReporteres(afiliadas, reporteres, {
    generatedAt: "2026-09-29T18:00:00.000Z",
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.generatedAt, "2026-09-29T18:00:00.000Z");
  assert.deepEqual(snapshot.afiliadas, [
    { id: "AFL001", nome: "TV BRASIL CENTRAL", uf: "GOIÁS - GO", cidade: "GOIÂNIA", ativa: true },
    { id: "AFL002", nome: "TV REDE MINAS", uf: "MINAS GERAIS - MG", cidade: "", ativa: false },
  ]);
  assert.deepEqual(snapshot.reporteres, [
    { id: "REP001", nome: "LUIZA MORAES", afiliadaId: "AFL001", funcao: "REPÓRTER", ativo: true },
    { id: "REP002", nome: "LUCIANO TEIXEIRA", afiliadaId: "AFL002", funcao: "REPÓRTER", ativo: false },
  ]);
});

test("rejeita AFILIADA_ID duplicado", () => {
  assert.throws(
    () => criarSnapshotAfiliadasReporteres([
      ...afiliadas,
      ["AFL001", "OUTRA TV", "SÃO PAULO - SP", "SÃO PAULO", "SIM"],
    ], reporteres),
    /AFILIADA_ID duplicado.*AFL001/i
  );
});

test("rejeita repórter ligado a afiliada inexistente", () => {
  assert.throws(
    () => criarSnapshotAfiliadasReporteres(afiliadas, [
      ["REP099", "REPÓRTER TESTE", "AFL999", "REPÓRTER", "SIM"],
    ]),
    /afiliada inexistente.*AFL999/i
  );
});

test("rejeita status diferente de SIM ou NÃO", () => {
  assert.throws(
    () => criarSnapshotAfiliadasReporteres([
      ["AFL001", "TV BRASIL CENTRAL", "GOIÁS - GO", "GOIÂNIA", "ATIVA"],
    ], []),
    /ATIVA.*SIM.*NÃO/i
  );
});
