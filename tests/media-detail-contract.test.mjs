import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const playerPath = fileURLToPath(new URL("../js/media-player.js", import.meta.url));
const detailPath = fileURLToPath(new URL("../js/media-detail.js", import.meta.url));
const pagePath = fileURLToPath(new URL("../pages/media.html", import.meta.url));

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

test("página da ficha expõe metadados sem renderizar player de vídeo", () => {
  assert.ok(fs.existsSync(pagePath), "pages/media.html deve existir");
  const html = fs.readFileSync(pagePath, "utf8");
  for (const id of ["mediaTitle", "mediaDescription", "mediaMetadata", "mediaSegments", "mediaRelated", "mediaQuality"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(html, /id=["']mediaPlayer["']/);
  assert.ok(!html.includes("media-player.js"), "a ficha não deve carregar media-player.js");
  assert.ok(html.includes("dados.js?v=7"), "dados.js deve ter versão nova para invalidar cache");
  assert.ok(html.includes("media-detail.js?v=2"), "media-detail.js deve ter versão nova para invalidar cache");
  assert.ok(html.includes("media-detail.css?v=2"), "media-detail.css deve ter versão nova para invalidar cache");
  for (const script of ["media-id.js", "dados.js", "media-enrichment.js", "media-segments.js", "related-media.js", "catalogo-quality.js", "media-detail.js"]) {
    assert.ok(html.includes(script), `${script} deve ser carregado`);
  }
});

test("ficha individual não depende do player para inicializar", () => {
  const source = fs.readFileSync(detailPath, "utf8");
  assert.doesNotMatch(source, /\bMediaPlayer\b/);
  assert.doesNotMatch(source, /configurarPlayer/);
});

test("ficha individual exibe a duração resolvida para o Media ID", () => {
  const source = fs.readFileSync(detailPath, "utf8");
  assert.match(source, /\["Duração",\s*registro\.DURACAO\]/);
});
