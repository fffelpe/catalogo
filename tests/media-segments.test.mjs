import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const paths = {
  mediaId: fileURLToPath(new URL("../js/media-id.js", import.meta.url)),
  enrichment: fileURLToPath(new URL("../js/media-enrichment.js", import.meta.url)),
  segments: fileURLToPath(new URL("../js/media-segments.js", import.meta.url))
};

async function carregar(payload) {
  assert.ok(fs.existsSync(paths.segments), "media-segments.js deve existir");
  const sandbox = {
    console,
    URL,
    fetch: async () => ({ ok: true, json: async () => payload })
  };
  vm.createContext(sandbox);
  for (const nome of ["mediaId", "enrichment", "segments"]) {
    const source = fs.readFileSync(paths[nome], "utf8");
    vm.runInContext(source, sandbox);
  }
  vm.runInContext("globalThis.__MediaEnrichment = MediaEnrichment; globalThis.__MediaSegments = MediaSegments;", sandbox);
  await sandbox.__MediaEnrichment.carregar();
  return sandbox.__MediaSegments;
}

test("busca termos dentro de segmentos e preserva timecode", async () => {
  const MediaSegments = await carregar({
    schemaVersion: 1,
    items: {
      "1452B004869": {
        segments: [{ start: 28, end: 46, text: "Bombeiros auxiliam moradores durante enchente" }]
      }
    }
  });

  const resultados = MediaSegments.buscar("1452B004869", "bombeiros enchente");
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].mediaId, "1452B004869");
  assert.equal(resultados[0].start, 28);
});

test("busca em registro com múltiplos IDs mantém o ID que originou o trecho", async () => {
  const MediaSegments = await carregar({
    schemaVersion: 1,
    items: {
      "1452B004870": {
        segments: [{ start: 12, text: "Rua completamente alagada" }]
      }
    }
  });

  const resultados = MediaSegments.buscarEmRegistro(
    { ID: "1452B004869 / 1452B004870" },
    "alagada"
  );

  assert.equal(resultados[0].mediaId, "1452B004870");
  assert.equal(resultados[0].start, 12);
});

test("formata timecode e cria URL de ficha segura", async () => {
  const MediaSegments = await carregar({ schemaVersion: 1, items: {} });
  assert.equal(MediaSegments.formatarTimecode(88), "01:28");
  assert.equal(
    MediaSegments.criarUrlFicha("1452B004869", 28),
    "media.html?id=1452B004869&t=28"
  );
  assert.equal(MediaSegments.criarUrlFicha("<script>", 28), "");
});
