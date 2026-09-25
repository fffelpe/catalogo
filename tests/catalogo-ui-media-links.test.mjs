import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const segmentsPath = fileURLToPath(new URL("../js/media-segments.js", import.meta.url));
const uiPath = fileURLToPath(new URL("../js/catalogo-ui.js", import.meta.url));

function carregar() {
  const sandbox = {
    console,
    navigator: {},
    window: { isSecureContext: false, setTimeout() {} },
    document: {
      addEventListener() {},
      getElementById() { return null; },
      querySelectorAll() { return []; }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(segmentsPath, "utf8") + "\nglobalThis.MediaSegments = MediaSegments;", sandbox);
  vm.runInContext(fs.readFileSync(uiPath, "utf8") + "\nglobalThis.__ui = { formatarIdsComCopia, renderizarTrechoEncontrado };", sandbox);
  return sandbox.__ui;
}

test("cada Media ID da célula aponta para sua própria ficha", () => {
  const { formatarIdsComCopia } = carregar();
  const html = formatarIdsComCopia("1452B004869 / 1452B004870");
  assert.ok(html.includes("media.html?id=1452B004869"));
  assert.ok(html.includes("media.html?id=1452B004870"));
  assert.equal((html.match(/btn-copiar-id/g) || []).length, 2);
});

test("melhor trecho gera CTA com timecode e link para o ponto encontrado", () => {
  const { renderizarTrechoEncontrado } = carregar();
  const html = renderizarTrechoEncontrado({
    ID: "1452B004869",
    _SEARCH_SEGMENT_MATCHES: [{ mediaId: "1452B004869", start: 28, text: "Bombeiros auxiliam moradores" }]
  });
  assert.ok(html.includes("Trecho encontrado · 00:28"));
  assert.ok(html.includes("media.html?id=1452B004869&amp;t=28"));
});
