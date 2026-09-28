import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const cssPath = fileURLToPath(new URL("../css/search-results-cards.css", import.meta.url));
const jsPath = fileURLToPath(new URL("../js/search-results-cards.js", import.meta.url));
const buscaPath = fileURLToPath(new URL("../pages/resultado-busca.html", import.meta.url));
const programaPath = fileURLToPath(new URL("../pages/programa.html", import.meta.url));

test("cards seguem a opção 3 com cinco itens por linha e hierarquia do exemplo", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  const busca = fs.readFileSync(buscaPath, "utf8");
  const programa = fs.readFileSync(programaPath, "utf8");

  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /grid-template-areas:[\s\S]*?["']programa programa["'][\s\S]*?["']titulo titulo["'][\s\S]*?["']id id["'][\s\S]*?["']local local["'][\s\S]*?["']reporter reporter["'][\s\S]*?["']data duracao["'][\s\S]*?["']rodape rodape["']/);
  assert.match(css, /\.resultado-titulo[\s\S]*?font-weight:\s*700/);
  assert.match(css, /\.resultado-titulo[\s\S]*?-webkit-line-clamp:\s*2/);
  assert.match(css, /\.resultado-programa-badge[\s\S]*?text-transform:\s*uppercase/);
  assert.match(css, /\.resultado-data::before[\s\S]*?content:\s*["']Data:\s["']/);
  assert.match(css, /\.resultado-duracao::before[\s\S]*?content:\s*["']Duração:\s["']/);
  assert.match(css, /\.resultado-reporter::before[\s\S]*?content:\s*["']Repórter:\s["']/);
  assert.match(css, /\.resultado-rodape[\s\S]*?border-top:\s*1px\s+solid/);
  assert.match(css, /@media\s*\(max-width:\s*1280px\)[\s\S]*?repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media\s*\(max-width:\s*1024px\)[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media\s*\(max-width:\s*520px\)[\s\S]*?grid-template-columns:\s*1fr/);

  assert.match(js, /"Descrição":\s*"resultado-titulo"/);
  assert.match(js, /"Data":\s*"resultado-data"/);
  assert.match(js, /function\s+resumirDescricao\s*\(/);
  assert.match(js, /function\s+garantirDuracao\s*\(/);
  assert.match(js, /function\s+garantirPrograma\s*\(/);
  assert.match(js, /function\s+criarRodape\s*\(/);
  assert.match(js, /function\s+realocarCreditos\s*\(/);
  assert.match(js, /link\.append\(document\.createTextNode\("Veja mais"\)\)/);
  assert.match(js, /"mamAgroBody"/);
  assert.match(js, /"tbodyVtsAgro"/);

  for (const html of [busca, programa]) {
    assert.ok(html.includes("search-results-cards.css"));
    assert.ok(html.includes("search-results-cards.js"));
  }
});
