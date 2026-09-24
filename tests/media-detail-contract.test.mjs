import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const playerPath = fileURLToPath(new URL("../js/media-player.js", import.meta.url));
const pagePath = fileURLToPath(new URL("../pages/media.html", import.meta.url));

function carregarPlayer() {
  assert.ok(fs.existsSync(playerPath), "media-player.js deve existir");
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(playerPath, "utf8") + "\nglobalThis.__MediaPlayer = MediaPlayer;", sandbox);
  return sandbox.__MediaPlayer;
}

test("player monta lowres apenas para Media ID válido", () => {
  const MediaPlayer = carregarPlayer();
  assert.equal(MediaPlayer.criarUrl("1452B004869"), "http://lowres.tvcultura.com.br/1452B004869.mp4");
  assert.equal(MediaPlayer.criarUrl("javascript:alert(1)"), "");
  assert.equal(MediaPlayer.normalizarInicio(-10), 0);
  assert.equal(MediaPlayer.normalizarInicio("28.5"), 28.5);
});

test("página da ficha expõe mounts e dependências principais", () => {
  assert.ok(fs.existsSync(pagePath), "pages/media.html deve existir");
  const html = fs.readFileSync(pagePath, "utf8");
  for (const id of ["mediaTitle", "mediaPlayer", "mediaDescription", "mediaMetadata", "mediaSegments", "mediaRelated", "mediaQuality"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const script of ["media-id.js", "dados.js", "media-enrichment.js", "media-segments.js", "related-media.js", "catalogo-quality.js", "media-player.js", "media-detail.js"]) {
    assert.ok(html.includes(script), `${script} deve ser carregado`);
  }
});
