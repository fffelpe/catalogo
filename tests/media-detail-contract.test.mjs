import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const playerPath = fileURLToPath(new URL("../js/media-player.js", import.meta.url));
const pagePath = fileURLToPath(new URL("../pages/media.html", import.meta.url));
const detailPath = fileURLToPath(new URL("../js/media-detail.js", import.meta.url));

function carregarPlayer({ protocolo = "http:", proxyBaseUrl = "" } = {}) {
  assert.ok(fs.existsSync(playerPath), "media-player.js deve existir");
  const sandbox = {
    console,
    window: {
      location: {
        protocol: protocolo,
        href: `${protocolo}//catalogo.test/pages/media.html`
      }
    }
  };
  if (proxyBaseUrl) sandbox.CATALOGO_VIDEO_PROXY_BASE_URL = proxyBaseUrl;

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(playerPath, "utf8") + "\nglobalThis.__MediaPlayer = MediaPlayer;", sandbox);
  return sandbox.__MediaPlayer;
}

test("player usa lowres direto somente em contexto HTTP", () => {
  const MediaPlayer = carregarPlayer({ protocolo: "http:" });
  assert.equal(MediaPlayer.criarUrl("1452B004869"), "http://lowres.tvcultura.com.br/1452B004869.mp4");
  assert.equal(MediaPlayer.criarUrl("javascript:alert(1)"), "");
  assert.equal(MediaPlayer.normalizarInicio(-10), 0);
  assert.equal(MediaPlayer.normalizarInicio("28.5"), 28.5);
});

test("player bloqueia mixed content em contexto HTTPS sem proxy seguro", () => {
  const MediaPlayer = carregarPlayer({ protocolo: "https:" });
  assert.equal(MediaPlayer.criarUrl("1452B004869"), "");
});

test("player usa proxy HTTPS configurado para acesso seguro", () => {
  const MediaPlayer = carregarPlayer({
    protocolo: "https:",
    proxyBaseUrl: "https://media-proxy.intranet/"
  });
  assert.equal(
    MediaPlayer.criarUrl("1452B004869"),
    "https://media-proxy.intranet/1452B004869.mp4"
  );
});

test("player rejeita proxy configurado por HTTP em página HTTPS", () => {
  const MediaPlayer = carregarPlayer({
    protocolo: "https:",
    proxyBaseUrl: "http://media-proxy.intranet/"
  });
  assert.equal(MediaPlayer.criarUrl("1452B004869"), "");
});

test("página da ficha mantém conteúdo editorial sem player de vídeo", () => {
  assert.ok(fs.existsSync(pagePath), "pages/media.html deve existir");
  const html = fs.readFileSync(pagePath, "utf8");

  for (const id of ["mediaTitle", "mediaDescription", "mediaMetadata", "mediaSegments", "mediaRelated", "mediaQuality"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.doesNotMatch(html, /id=["']mediaPlayer["']/);
  assert.doesNotMatch(html, /id=["']mediaPlayerStatus["']/);
  assert.ok(!html.includes("media-player.js"), "media-player.js não deve ser carregado pela ficha individual");
  assert.ok(!html.includes("Clique no timecode para assistir"), "a ficha não deve sugerir reprodução");
});

test("detalhe da ficha renderiza trechos informativos sem controles de reprodução", () => {
  assert.ok(fs.existsSync(detailPath), "js/media-detail.js deve existir");
  const js = fs.readFileSync(detailPath, "utf8");

  assert.ok(!js.includes("configurarPlayer"), "a ficha não deve configurar player");
  assert.ok(!js.includes("MediaPlayer.irPara"), "os trechos não devem controlar reprodução");
  assert.ok(!js.includes("media-segment-play"), "os trechos não devem exibir ícone de play");
});
