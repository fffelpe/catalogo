import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const cssPath = fileURLToPath(new URL("../css/search-results-cards.css", import.meta.url));
const jsPath = fileURLToPath(new URL("../js/search-results-cards.js", import.meta.url));
const buscaPath = fileURLToPath(new URL("../pages/resultado-busca.html", import.meta.url));
const programaPath = fileURLToPath(new URL("../pages/programa.html", import.meta.url));

test("resultados gerais usam cards editoriais compactos sem player de vídeo", () => {
  assert.ok(fs.existsSync(cssPath), "css/search-results-cards.css deve existir");
  assert.ok(fs.existsSync(jsPath), "js/search-results-cards.js deve existir");

  const css = fs.readFileSync(cssPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  const busca = fs.readFileSync(buscaPath, "utf8");
  const programa = fs.readFileSync(programaPath, "utf8");

  assert.match(css, /\.results-table\s+tbody/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /["']programa programa["']/);
  assert.match(css, /["']titulo titulo["']/);
  assert.match(css, /["']id id["']/);
  assert.match(css, /["']data duracao["']/);
  assert.match(css, /["']rodape rodape["']/);
  assert.match(css, /\.resultado-id/);
  assert.match(css, /\.resultado-titulo/);
  assert.match(css, /\.resultado-reporter/);
  assert.match(css, /\.resultado-local/);
  assert.match(css, /\.resultado-data/);
  assert.match(css, /\.resultado-duracao/);
  assert.match(css, /\.resultado-programa-badge/);
  assert.match(css, /\.resultado-meta-oculto-card/);
  assert.match(css, /border-radius:\s*8px/);

  assert.match(js, /"Descrição":\s*"resultado-titulo"/);
  assert.match(js, /"Repórter":\s*"resultado-reporter"/);
  assert.match(js, /"Local":\s*"resultado-local"/);
  assert.match(js, /"Programa":\s*"resultado-programa-badge"/);
  assert.match(js, /"Data":\s*"resultado-data"/);
  assert.match(js, /"Afiliada \/ Emissora":\s*"resultado-meta-oculto-card"/);
  assert.match(js, /"Editoria":\s*"resultado-meta-oculto-card"/);
  assert.match(js, /resultado-id/);
  assert.match(js, /MutationObserver/);
  assert.match(js, /resultado-detalhes/);
  assert.match(js, /resultado-duracao/);
  assert.match(js, /Com créditos/);

  for (const html of [busca, programa]) {
    assert.ok(html.includes("search-results-cards.css"), "a página deve carregar o CSS de cards");
    assert.ok(html.includes("search-results-cards.js"), "a página deve carregar o JS de cards");
  }

  assert.doesNotMatch(css, /<video|video-player|media-player/i);
  assert.doesNotMatch(js, /<video|video-player|media-player|lowres\.tvcultura\.com\.br/i);
});
