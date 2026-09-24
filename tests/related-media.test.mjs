import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const arquivos = [
  "../js/media-id.js",
  "../js/media-enrichment.js",
  "../js/related-media.js"
].map((rel) => fileURLToPath(new URL(rel, import.meta.url)));

async function carregar(payload) {
  assert.ok(fs.existsSync(arquivos[2]), "related-media.js deve existir");
  const sandbox = {
    console,
    URL,
    fetch: async () => ({ ok: true, json: async () => payload })
  };
  vm.createContext(sandbox);
  for (const arquivo of arquivos) {
    vm.runInContext(fs.readFileSync(arquivo, "utf8"), sandbox);
  }
  vm.runInContext(
    "globalThis.__MediaEnrichment = MediaEnrichment; globalThis.__RelatedMedia = RelatedMedia;",
    sandbox
  );
  await sandbox.__MediaEnrichment.carregar();
  return sandbox.__RelatedMedia;
}

test("assunto e palavra-chave compartilhados pesam mais que mesmo programa", async () => {
  const RelatedMedia = await carregar({
    schemaVersion: 1,
    items: {
      "1452B004869": { subjects: ["enchente"], keywords: ["chuva", "bombeiros"] },
      "1452B004870": { subjects: ["enchente"], keywords: ["chuva"] }
    }
  });

  const atual = {
    ID: "1452B004869",
    DESCRICAO: "Bombeiros atuam durante enchente",
    DATA: "10/02/2023",
    LOCAL: "São Paulo",
    PROGRAMA: "Jornal da Cultura",
    EDITORIA: "Cidades"
  };

  const porTema = {
    ID: "1452B004870",
    DESCRICAO: "Chuva causa alagamentos",
    DATA: "09/02/2023",
    LOCAL: "São Paulo",
    PROGRAMA: "Outro Programa",
    EDITORIA: "Cidades"
  };

  const soPrograma = {
    ID: "1452B004871",
    DESCRICAO: "Economia internacional",
    DATA: "10/02/2023",
    LOCAL: "Brasília",
    PROGRAMA: "Jornal da Cultura",
    EDITORIA: "Economia"
  };

  const resultados = RelatedMedia.calcular(atual, [atual, soPrograma, porTema], {
    mediaId: "1452B004869"
  });

  assert.equal(resultados[0].registro.ID, "1452B004870");
});

test("não retorna o próprio registro nem IDs associados e limita a seis", async () => {
  const items = {};
  for (let i = 870; i < 880; i++) {
    items[`1452B00${i}`] = { subjects: ["enchente"] };
  }
  items["1452B004869"] = { subjects: ["enchente"] };

  const RelatedMedia = await carregar({ schemaVersion: 1, items });
  const atual = { ID: "1452B004869 / 1452B004868", DESCRICAO: "Enchente", PROGRAMA: "JC" };
  const registros = [
    atual,
    { ID: "1452B004868", DESCRICAO: "Mesmo registro associado", PROGRAMA: "JC" },
    ...Object.keys(items)
      .filter((id) => id !== "1452B004869")
      .map((id) => ({ ID: id, DESCRICAO: "Enchente em São Paulo", PROGRAMA: "JC" }))
  ];

  const resultados = RelatedMedia.calcular(atual, registros, { mediaId: "1452B004869" });
  assert.ok(resultados.length <= 6);
  assert.ok(resultados.every((item) => !MediaIdSet(item.registro.ID).has("1452B004868")));

  function MediaIdSet(valor) {
    const encontrados = String(valor).match(/\d{4}[A-Z]\d{5,6}/g) || [];
    return new Set(encontrados);
  }
});
