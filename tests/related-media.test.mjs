import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const relatedPath = fileURLToPath(new URL("../js/related-media.js", import.meta.url));

function carregar(enrichment = {}) {
  assert.ok(fs.existsSync(relatedPath), "related-media.js deve existir");
  const sandbox = {
    console,
    MediaEnrichment: { obter: (id) => enrichment[id] || null }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(relatedPath, "utf8") + "\nglobalThis.__RelatedMedia = RelatedMedia;", sandbox);
  return sandbox.__RelatedMedia;
}

test("prioriza assunto e descrição semelhantes antes de programa igual", () => {
  const RelatedMedia = carregar({
    "1452B004869": { subjects: ["enchente"], keywords: ["chuva", "alagamento"] },
    "1452B004871": { subjects: ["enchente"], keywords: ["alagamento"] }
  });

  const alvo = { ID: "1452B004869", DESCRICAO: "Enchente em São Paulo", PROGRAMA: "JC", DATA: "10/02/2023" };
  const candidatos = [
    { ID: "1452B004870", DESCRICAO: "Futebol", PROGRAMA: "JC", DATA: "10/02/2023" },
    { ID: "1452B004871", DESCRICAO: "Alagamentos após chuva", PROGRAMA: "Repórter Eco", DATA: "09/02/2023" }
  ];

  const resultado = RelatedMedia.calcular(alvo, candidatos, { limite: 6, scoreMinimo: 1 });
  assert.equal(resultado[0].ID, "1452B004871");
});

test("não retorna o próprio Media ID", () => {
  const RelatedMedia = carregar();
  const alvo = { ID: "1452B004869", DESCRICAO: "Chuva" };
  assert.equal(RelatedMedia.calcular(alvo, [alvo], { limite: 6 }).length, 0);
});
