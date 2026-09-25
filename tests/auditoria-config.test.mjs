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

test("créditos publicam com retry sem git pull --rebase", () => {
  const workflow = ler(".github/workflows/sincronizar-creditos.yml");
  assert.match(workflow, /for tentativa in 1 2 3 4 5/);
  assert.match(workflow, /git fetch origin main/);
  assert.match(workflow, /git reset --hard origin\/main/);
  assert.match(workflow, /\/tmp\/catalogo-creditos/);
  assert.doesNotMatch(workflow, /git pull --rebase/);
});

test("sincronização de créditos usa pdf-parse v2 para PDFs modernos", () => {
  const pacote = JSON.parse(ler("package.json"));
  assert.match(pacote.dependencies?.["pdf-parse"] || "", /^\^2\.4\./);

  const sync = ler("scripts/sincronizar-creditos.mjs");
  assert.match(sync, /import\s*\{\s*PDFParse\s*\}\s*from\s*["']pdf-parse["']/);
  assert.match(sync, /new PDFParse\(\{\s*data:/);
  assert.match(sync, /\.getText\(\)/);
  assert.match(sync, /\.destroy\(\)/);
});

test("sincronização respeita cooldown da cota do Google Sheets entre etapas pesadas", () => {
  const pacote = JSON.parse(ler("package.json"));
  const comando = pacote.scripts?.["sync:planilhas"] || "";
  const primeira = comando.indexOf("sincronizar-planilhas.mjs");
  const cooldown = comando.indexOf("aguardar-cota-sheets.mjs");
  const segunda = comando.indexOf("sincronizar-noticias-agrocultura.mjs");

  assert.ok(primeira >= 0, "sincronizar-planilhas.mjs deve permanecer no pipeline");
  assert.ok(cooldown > primeira, "cooldown deve rodar depois da sincronização principal");
  assert.ok(segunda > cooldown, "integração AgroCultura deve rodar depois do cooldown");
  assert.equal(fs.existsSync("scripts/aguardar-cota-sheets.mjs"), true, "script de cooldown deve existir");

  const espera = ler("scripts/aguardar-cota-sheets.mjs");
  assert.match(espera, /SHEETS_SYNC_COOLDOWN_MS/);
  assert.match(espera, /65000/);
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
