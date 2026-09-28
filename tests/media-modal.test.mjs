import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const modalJsPath = fileURLToPath(new URL("../js/media-modal.js", import.meta.url));
const modalCssPath = fileURLToPath(new URL("../css/media-modal.css", import.meta.url));
const cardsJsPath = fileURLToPath(new URL("../js/search-results-cards.js", import.meta.url));
const buscaPath = fileURLToPath(new URL("../pages/resultado-busca.html", import.meta.url));
const programaPath = fileURLToPath(new URL("../pages/programa.html", import.meta.url));

test("Veja mais abre modal de detalhes com fechamento acessível e fallback para media.html", () => {
  assert.ok(fs.existsSync(modalJsPath), "js/media-modal.js deve existir");
  assert.ok(fs.existsSync(modalCssPath), "css/media-modal.css deve existir");

  const modalJs = fs.readFileSync(modalJsPath, "utf8");
  const modalCss = fs.readFileSync(modalCssPath, "utf8");
  const cardsJs = fs.readFileSync(cardsJsPath, "utf8");
  const busca = fs.readFileSync(buscaPath, "utf8");
  const programa = fs.readFileSync(programaPath, "utf8");

  assert.match(cardsJs, /data-media-id/);
  assert.match(cardsJs, /resultado-detalhes/);
  assert.match(cardsJs, /media\.html\?id=/);

  assert.match(modalJs, /document\.addEventListener\("click"/);
  assert.match(modalJs, /\.resultado-detalhes/);
  assert.match(modalJs, /event\.preventDefault\(\)/);
  assert.match(modalJs, /KeyboardEvent|event\.key\s*===\s*["']Escape["']/);
  assert.match(modalJs, /MediaModal\.fechar|function\s+fechar\s*\(/);
  assert.match(modalJs, /DadosMedia\.buscarPorMediaId/);
  assert.match(modalJs, /MediaEnrichment/);
  assert.match(modalJs, /CreditosMedia/);
  assert.match(modalJs, /aria-modal/);
  assert.match(modalJs, /role/);
  assert.match(modalJs, /media-modal-fechar/);
  assert.match(modalJs, /media-modal-backdrop/);
  assert.match(modalJs, /document\.body\.classList\.add\(["']modal-aberto["']\)/);
  assert.match(modalJs, /document\.body\.classList\.remove\(["']modal-aberto["']\)/);

  assert.match(modalCss, /\.media-modal-backdrop/);
  assert.match(modalCss, /\.media-modal-dialog/);
  assert.match(modalCss, /max-height:\s*min\(/);
  assert.match(modalCss, /overflow-y:\s*auto/);
  assert.match(modalCss, /body\.modal-aberto/);
  assert.match(modalCss, /@media\s*\(max-width:/);

  for (const html of [busca, programa]) {
    assert.ok(html.includes("media-modal.css"), "a página deve carregar o CSS do modal");
    assert.ok(html.includes("media-modal.js"), "a página deve carregar o JS do modal");
    assert.ok(html.includes("media-enrichment.js"), "a página deve carregar enrichment para o modal");
    assert.ok(html.includes("media-segments.js"), "a página deve carregar segmentos para o modal");
  }
});
