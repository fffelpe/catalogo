import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const segmentsPath = fileURLToPath(new URL("../js/media-segments.js", import.meta.url));

function carregarModulo(segmentos = {}) {
  assert.ok(fs.existsSync(segmentsPath), "media-segments.js deve existir");
  const mediaIdSource = fs.readFileSync(mediaIdPath, "utf8");
  const segmentsSource = fs.readFileSync(segmentsPath, "utf8");
  const sandbox = {
    console,
    MediaEnrichment: {
      obterSegmentos(id) {
        return segmentos[id] || [];
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${mediaIdSource}\n${segmentsSource}\nglobalThis.__MediaSegments = MediaSegments;`, sandbox);
  return sandbox.__MediaSegments;
}

test("formata timecodes e cria URL segura da ficha", () => {
  const MediaSegments = carregarModulo();
  assert.equal(MediaSegments.formatarTimecode(65), "01:05");
  assert.equal(MediaSegments.formatarTimecode(3661), "01:01:01");
  assert.equal(MediaSegments.criarUrlFicha("1452B004869", 28), "media.html?id=1452B004869&t=28");
  assert.equal(MediaSegments.criarUrlFicha("<script>", 28), "");
});

test("encontra termos distribuídos no texto do segmento", () => {
  const MediaSegments = carregarModulo({
    "1452B004869": [
      { start: 28, end: 46, text: "Bombeiros auxiliam moradores durante enchente" },
      { start: 60, end: 75, text: "Trânsito volta ao normal" }
    ]
  });

  const achados = MediaSegments.buscar("1452B004869", "bombeiros enchente");
  assert.equal(achados.length, 1);
  assert.equal(achados[0].start, 28);
  assert.ok(achados[0].score > 0);
});

test("consulta composta exige todos os termos úteis para match forte", () => {
  const MediaSegments = carregarModulo({
    "1452B004869": [
      { start: 28, text: "Bombeiros auxiliam moradores durante enchente" },
      { start: 55, text: "Bombeiros retornam ao quartel" }
    ]
  });

  const achados = MediaSegments.buscar("1452B004869", "bombeiros enchente");
  assert.equal(achados[0].start, 28);
  assert.ok(achados[0].score > (achados[1]?.score || 0));
});
