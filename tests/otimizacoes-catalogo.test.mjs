import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { conteudoEquivalente } from "../scripts/estabilizar-snapshots.mjs";
import { otimizarJsonPublicacao } from "../scripts/otimizar-json-publicacao.mjs";

const raiz = fileURLToPath(new URL("../", import.meta.url));

test("Media ID exato usa índice e mantém resultados duplicados e filtro por programa", async () => {
  let creditoConsultas = 0;
  const sandbox = {
    console,
    CreditosMedia: { camposPesquisa() { creditoConsultas++; return {}; } },
    MediaEnrichment: { camposPesquisa() { return {}; } }
  };
  vm.createContext(sandbox);
  const mediaId = await fs.readFile(path.join(raiz, "js/media-id.js"), "utf8");
  const search = await fs.readFile(path.join(raiz, "js/search-engine.js"), "utf8");
  vm.runInContext(mediaId + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(search + "\nglobalThis.SearchEngine = SearchEngine;", sandbox);
  const registros = [
    { ID: "1452B004869 / 1452B004870", PROGRAMA: "JC", DESCRICAO: "Chuva" },
    { ID: "1452B004869", PROGRAMA: "Agrocultura", DESCRICAO: "Café" },
    { ID: "1452B004871", PROGRAMA: "JC", DESCRICAO: "1452B004869 citado no texto" }
  ];
  const resultados = sandbox.SearchEngine.pesquisar(registros, "1452b004869.mp4");
  assert.deepEqual(resultados.map(x => x.PROGRAMA), ["JC", "Agrocultura"]);
  assert.ok(resultados.every(x => x._SEARCH_SCORE === 10000));
  assert.equal(creditoConsultas, 0, "busca exata não deve enriquecer todos os registros");
  const filtrados = sandbox.SearchEngine.pesquisar(registros, "1452B004869", { programa: "Agrocultura" });
  assert.equal(filtrados.length, 1);
  assert.equal(filtrados[0].PROGRAMA, "Agrocultura");
});

test("requisições simultâneas de créditos reutilizam uma única transferência", async () => {
  let chamadas = 0;
  let resolver;
  const respostaPendente = new Promise((resolve) => { resolver = resolve; });
  const sandbox = {
    fetch: async () => { chamadas++; await respostaPendente; return { ok: true, json: async () => ({ "1452B004869": { materia: "Teste" } }) }; }
  };
  vm.createContext(sandbox);
  const codigo = await fs.readFile(path.join(raiz, "js/creditos.js"), "utf8");
  vm.runInContext(codigo + "\nglobalThis.CreditosMedia = CreditosMedia;", sandbox);
  const p1 = sandbox.CreditosMedia.carregar();
  const p2 = sandbox.CreditosMedia.carregar();
  assert.equal(chamadas, 1);
  resolver();
  await Promise.all([p1, p2]);
  assert.equal(chamadas, 1);
  assert.equal(sandbox.CreditosMedia.obter("1452B004869").materia, "Teste");
});

test("somente a mudança no horário de geração não gera atualização redundante", () => {
  const antigo = { schemaVersion: 1, generatedAt: "2026-10-01T00:00:00Z", registros: [{ ID: "1452B004869" }] };
  const novo = { ...antigo, generatedAt: "2026-10-08T00:00:00Z" };
  assert.equal(conteudoEquivalente(antigo, novo), true);
  assert.equal(conteudoEquivalente(antigo, { ...novo, registros: [{ ID: "1452B004870" }] }), false);
  const statusAntigo = { sincronizadoEm: "ontem", totalConflitos: 30 };
  assert.equal(conteudoEquivalente(statusAntigo, { ...statusAntigo, sincronizadoEm: "hoje" }), true);
  assert.equal(conteudoEquivalente(statusAntigo, { sincronizadoEm: "hoje", totalConflitos: 31 }), false);
});

test("compactação de publicação preserva JSON e não muda arquivos fonte", async (t) => {
  const pasta = await mkdtemp(path.join(os.tmpdir(), "catalogo-pub-"));
  t.after(() => fs.rm(pasta, { recursive: true, force: true }));
  const entrada = { schemaVersion: 1, registros: [{ ID: "1452B004869", DESCRICAO: "São Paulo" }] };
  const texto = JSON.stringify(entrada, null, 2) + "\n";
  const arquivo = path.join(pasta, "catalogo-acervo.json");
  await fs.writeFile(arquivo, texto);
  const info = await otimizarJsonPublicacao(pasta);
  assert.equal(info.arquivos, 1);
  assert.ok(info.bytesCompactados < info.bytesOriginais);
  assert.deepEqual(JSON.parse(await fs.readFile(arquivo, "utf8")), entrada);
});

test("deploy admite snapshot antigo mas rejeita timestamp inválido", async (t) => {
  const pasta = await mkdtemp(path.join(os.tmpdir(), "catalogo-frescor-"));
  t.after(() => fs.rm(pasta, { recursive: true, force: true }));
  const arquivo = path.join(pasta, "snapshot.json");
  const comando = path.join(raiz, "scripts/verificar-frescor-snapshot.mjs");
  const executar = (env) => spawnSync(process.execPath, [comando, arquivo], {
    encoding: "utf8",
    env: { ...process.env, ...env, SNAPSHOT_MAX_AGE_MINUTES: "20" }
  });
  await fs.writeFile(arquivo, JSON.stringify({ generatedAt: "2020-01-01T00:00:00.000Z" }));
  assert.notEqual(executar({ SNAPSHOT_STALE_AS_WARNING: "false" }).status, 0);
  const aviso = executar({ SNAPSHOT_STALE_AS_WARNING: "true" });
  assert.equal(aviso.status, 0);
  assert.match(aviso.stderr, /AVISO/);
  await fs.writeFile(arquivo, JSON.stringify({ generatedAt: "inválido" }));
  assert.notEqual(executar({ SNAPSHOT_STALE_AS_WARNING: "true" }).status, 0);
});

test("validação de créditos ocorre antes da publicação", async () => {
  const yaml = await fs.readFile(path.join(raiz, ".github/workflows/sincronizar-creditos.yml"), "utf8");
  const validar = yaml.indexOf("- name: Rejeitar novos conflitos de créditos");
  const publicar = yaml.indexOf("- name: Publicar alterações");
  assert.ok(validar > -1 && publicar > validar);
  assert.match(yaml, /if: always\(\)/);
});

test("deploy compacta os JSON e trata frescor como aviso", async () => {
  const yaml = await fs.readFile(path.join(raiz, ".github/workflows/deploy-pages.yml"), "utf8");
  assert.match(yaml, /SNAPSHOT_STALE_AS_WARNING: "true"/);
  assert.match(yaml, /scripts\/otimizar-json-publicacao\.mjs/);
});
