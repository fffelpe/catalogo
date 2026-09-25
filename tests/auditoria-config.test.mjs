import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ler = (caminho) => fs.readFileSync(caminho, "utf8");

const workflowsDeterministicos = [
  ".github/workflows/deploy-pages.yml",
  ".github/workflows/sincronizar-planilhas.yml",
  ".github/workflows/sincronizar-creditos.yml",
  ".github/workflows/test-feature.yml"
];

test("deploy espera a sincronização e não concorre em push direto para main", () => {
  const deploy = ler(".github/workflows/deploy-pages.yml");
  assert.doesNotMatch(deploy, /\n\s{2}push:\s*\n/);
  assert.match(deploy, /workflow_run:/);
  assert.match(deploy, /Sincronizar planilhas do catálogo/);
});

test("sincronização roda em pushes de código e ignora commits apenas de snapshots", () => {
  const sync = ler(".github/workflows/sincronizar-planilhas.yml");
  assert.match(sync, /paths-ignore:\s*\n\s*- ["']data\/\*\*["']/);
  assert.doesNotMatch(sync, /\n\s{4}paths:\s*\n/);
});

test("deploy publica somente o diretório público enxuto", () => {
  const deploy = ler(".github/workflows/deploy-pages.yml");
  assert.match(deploy, /\.pages-dist/);
  assert.match(deploy, /path:\s*["']?\.pages-dist["']?/);
  assert.doesNotMatch(deploy, /path:\s*["']\.["']/);
});

test("workflows usam npm ci para instalações reproduzíveis", () => {
  assert.equal(fs.existsSync("package-lock.json"), true, "package-lock.json precisa estar versionado");

  for (const caminho of workflowsDeterministicos) {
    const workflow = ler(caminho);
    assert.match(workflow, /\bnpm ci\b/, `${caminho} deve usar npm ci`);
    assert.doesNotMatch(workflow, /\bnpm install\b/, `${caminho} não deve usar npm install`);
  }
});

test("repositório não publica hostname vercel.app como CNAME do GitHub Pages", () => {
  assert.equal(fs.existsSync("CNAME"), false);
});

test("home adia o carregamento do snapshot até interação do usuário", () => {
  const ui = ler("js/catalogo-ui.js");
  assert.match(ui, /carregarAutocompleteHomeSobDemanda/);
  assert.match(ui, /addEventListener\(["']focus["']/);
  assert.match(ui, /addEventListener\(["']input["']/);

  const inicio = ui.indexOf("async function inicializarPaginaInicial");
  const fim = ui.indexOf("async function inicializarPaginaResultados", inicio);
  assert.ok(inicio >= 0 && fim > inicio, "função inicializarPaginaInicial deve existir");
  const trecho = ui.slice(inicio, fim);
  assert.doesNotMatch(trecho, /\n\s*await DadosMedia\.carregarCSV\(\);/);
});
