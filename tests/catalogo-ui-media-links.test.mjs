import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const mediaSegmentsPath = fileURLToPath(new URL("../js/media-segments.js", import.meta.url));
const catalogoUiPath = fileURLToPath(new URL("../js/catalogo-ui.js", import.meta.url));

function carregarRenderizadores() {
  const sandbox = {
    console,
    URL,
    URLSearchParams,
    document: { addEventListener() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(mediaSegmentsPath, "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(catalogoUiPath, "utf8"), sandbox);
  vm.runInContext(`
    globalThis.__formatarIdsComCopia = formatarIdsComCopia;
    globalThis.__renderizarTrechoEncontrado = typeof renderizarTrechoEncontrado === "function"
      ? renderizarTrechoEncontrado
      : null;
  `, sandbox);
  return sandbox;
}

test("cada Media ID vira link para a ficha e mantém botão de copiar", () => {
  const sandbox = carregarRenderizadores();
  const html = sandbox.__formatarIdsComCopia("1452B004869 / 1452B004870");

  assert.match(html, /class="media-id-link" href="media\.html\?id=1452B004869"/);
  assert.match(html, /class="media-id-link" href="media\.html\?id=1452B004870"/);
  assert.equal((html.match(/class="btn-copiar-id"/g) || []).length, 2);
});

test("melhor trecho vira ação compacta para a ficha no timecode correto", () => {
  const sandbox = carregarRenderizadores();
  assert.equal(typeof sandbox.__renderizarTrechoEncontrado, "function");

  const html = sandbox.__renderizarTrechoEncontrado({
    _SEARCH_SEGMENT_MATCHES: [
      { mediaId: "1452B004869", start: 28, text: "Bombeiros auxiliam moradores" }
    ]
  });

  assert.match(html, /class="trecho-encontrado"/);
  assert.match(html, /media\.html\?id=1452B004869&amp;t=28/);
  assert.match(html, /Trecho encontrado · 00:28/);
});
