import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const playerPath = fileURLToPath(new URL("../js/media-player.js", import.meta.url));

function carregar() {
  assert.ok(fs.existsSync(playerPath), "media-player.js deve existir");
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(playerPath, "utf8"), sandbox);
  vm.runInContext("globalThis.__MediaPlayer = MediaPlayer;", sandbox);
  return sandbox.__MediaPlayer;
}

test("constrói URL lowres apenas para Media ID válido", () => {
  const MediaPlayer = carregar();
  assert.equal(
    MediaPlayer.criarUrl("1452B004869"),
    "http://lowres.tvcultura.com.br/1452B004869.mp4"
  );
  assert.equal(MediaPlayer.criarUrl("<script>"), "");
});

test("normaliza timecode inicial e aplica em vídeo já carregado", () => {
  const MediaPlayer = carregar();
  assert.equal(MediaPlayer.normalizarInicio("28.5"), 28.5);
  assert.equal(MediaPlayer.normalizarInicio(-3), 0);
  assert.equal(MediaPlayer.normalizarInicio("abc"), 0);

  const video = { readyState: 1, currentTime: 0 };
  MediaPlayer.aplicarInicio(video, 28);
  assert.equal(video.currentTime, 28);
});
