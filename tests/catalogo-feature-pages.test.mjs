import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function ler(relativo) {
  return fs.readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), "utf8");
}

function assertOrdem(source, itens) {
  let anterior = -1;
  itens.forEach((item) => {
    const atual = source.indexOf(item);
    assert.ok(atual >= 0, `${item} deve estar presente`);
    assert.ok(atual > anterior, `${item} deve carregar depois da dependência anterior`);
    anterior = atual;
  });
}

test("página de resultados carrega enrichment e segmentos antes do motor de busca", () => {
  const html = ler("../pages/resultado-busca.html");
  assertOrdem(html, [
    "media-id.js",
    "dados.js",
    "media-enrichment.js",
    "media-segments.js",
    "search-engine.js",
    "catalogo-ui.js"
  ]);
});

test("ficha do Media ID carrega módulos na ordem de dependências", () => {
  const html = ler("../pages/media.html");
  assertOrdem(html, [
    "media-id.js",
    "dados.js",
    "media-enrichment.js",
    "media-segments.js",
    "media-player.js",
    "related-media.js",
    "creditos.js",
    "media-detail.js"
  ]);
  assert.match(html, /id="mediaVideo"/);
  assert.match(html, /id="mediaRelated"/);
});

test("painel de qualidade carrega motor antes da UI", () => {
  const html = ler("../pages/qualidade.html");
  assertOrdem(html, [
    "media-id.js",
    "dados.js",
    "media-enrichment.js",
    "creditos.js",
    "catalogo-quality.js",
    "catalogo-quality-ui.js"
  ]);
});

test("somente o módulo de player conhece o host lowres", () => {
  const player = ler("../js/media-player.js");
  const busca = [
    ler("../js/search-engine.js"),
    ler("../js/catalogo-ui.js"),
    ler("../js/related-media.js"),
    ler("../js/catalogo-quality-ui.js")
  ].join("\n");

  assert.match(player, /lowres\.tvcultura\.com\.br/);
  assert.doesNotMatch(busca, /lowres\.tvcultura\.com\.br/);
  assert.doesNotMatch(busca, /method\s*:\s*["']HEAD["']/i);
});

test("descrição da ficha usa textContent e renderizações dinâmicas escapam HTML", () => {
  const detail = ler("../js/media-detail.js");
  const qualityUi = ler("../js/catalogo-quality-ui.js");
  const catalogoUi = ler("../js/catalogo-ui.js");

  assert.match(detail, /alvo\.textContent\s*=\s*String\(registro\.DESCRICAO/);
  assert.match(detail, /escapeHtml\(segmento\.text\)/);
  assert.match(qualityUi, /escapeHtml\(registro\.DESCRICAO/);
  assert.match(catalogoUi, /escapeHtml\(item\.DESCRICAO\)/);
});
