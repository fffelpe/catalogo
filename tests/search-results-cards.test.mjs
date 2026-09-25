import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const cssPath = fileURLToPath(new URL("../css/search-results-cards.css", import.meta.url));
const jsPath = fileURLToPath(new URL("../js/search-results-cards.js", import.meta.url));
const buscaPath = fileURLToPath(new URL("../pages/resultado-busca.html", import.meta.url));
const programaPath = fileURLToPath(new URL("../pages/programa.html", import.meta.url));

test("resultados gerais usam cards compactos em duas colunas sem player de vídeo", () => {
  assert.ok(fs.existsSync(cssPath), "css/search-results-cards.css deve existir");
  assert.ok(fs.existsSync(jsPath), "js/search-results-cards.js deve existir");

  const css = fs.readFileSync(cssPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  const busca = fs.readFileSync(buscaPath, "utf8");
  const programa = fs.readFileSync(programaPath, "utf8");

  assert.match(css, /\.results-table\s+tbody\s+tr\s*\{/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s+minmax\(260px,\s*\.65fr\)/);
  assert.match(css, /grid-template-areas:\s*["']id programa["']/);
  assert.match(css, /["']reporter local["']/);
  assert.match(css, /["']descricao afiliada["']/);
  assert.match(css, /["']\. acoes["']/);
  assert.match(css, /gap:\s*5px\s+24px/);
  assert.match(css, /padding:\s*10px\s+14px/);
  assert.match(css, /\.resultado-id/);
  assert.match(css, /\.resultado-reporter/);
  assert.match(css, /\.resultado-local/);
  assert.match(css, /\.resultado-descricao/);
  assert.match(css, /\.resultado-afiliada/);
  assert.match(css, /\.resultado-programa-badge/);
  assert.match(css, /\.resultado-meta-oculto-card/);
  assert.match(css, /border-radius:\s*12px/);
  assert.match(css, /box-shadow:/);

  assert.match(js, /"Repórter":\s*"resultado-reporter"/);
  assert.match(js, /"Local":\s*"resultado-local"/);
  assert.match(js, /"Descrição":\s*"resultado-descricao"/);
  assert.match(js, /"Afiliada \/ Emissora":\s*"resultado-afiliada"/);
  assert.match(js, /"Programa":\s*"resultado-programa-badge"/);
  assert.match(js, /"Data":\s*"resultado-meta-oculto-card"/);
  assert.match(js, /"Editoria":\s*"resultado-meta-oculto-card"/);
  assert.match(js, /resultado-id/);
  assert.match(js, /MutationObserver/);
  assert.match(js, /resultado-detalhes/);

  for (const html of [busca, programa]) {
    assert.ok(html.includes("search-results-cards.css"), "a página deve carregar o CSS de cards");
    assert.ok(html.includes("search-results-cards.js"), "a página deve carregar o JS de cards");
  }

  assert.doesNotMatch(css, /<video|video-player|media-player/i);
  assert.doesNotMatch(js, /<video|video-player|media-player|lowres\.tvcultura\.com\.br/i);
});
