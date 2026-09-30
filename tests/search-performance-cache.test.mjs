import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const mediaIdPath = fileURLToPath(new URL("../js/media-id.js", import.meta.url));
const searchPath = fileURLToPath(new URL("../js/search-engine.js", import.meta.url));

function carregar() {
  let chamadasCreditos = 0;
  let chamadasEnriquecimento = 0;
  let chamadasSegmentos = 0;

  const sandbox = {
    console,
    CreditosMedia: {
      camposPesquisa() {
        chamadasCreditos += 1;
        return {
          CREDITOS_MATERIA: "",
          CREDITOS_FONTES: "",
          CREDITOS_EQUIPE: "",
          CREDITOS_CARGOS: "",
          CREDITOS_TEXTO: ""
        };
      }
    },
    MediaEnrichment: {
      camposPesquisa() {
        chamadasEnriquecimento += 1;
        return {
          KEYWORDS: "",
          SUBJECTS: "",
          PEOPLE: "",
          PLACES: "",
          SEGMENTS: ""
        };
      }
    },
    MediaSegments: {
      buscar() {
        chamadasSegmentos += 1;
        return [];
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(mediaIdPath, "utf8") + "\nglobalThis.MediaIdUtils = MediaIdUtils;", sandbox);
  vm.runInContext(fs.readFileSync(searchPath, "utf8") + "\nglobalThis.__SearchEngine = SearchEngine;", sandbox);

  return {
    SearchEngine: sandbox.__SearchEngine,
    contadores: () => ({ chamadasCreditos, chamadasEnriquecimento }),
    chamadasSegmentos: () => chamadasSegmentos
  };
}

test("buscas repetidas reutilizam o enriquecimento preparado de cada registro", () => {
  const { SearchEngine, contadores } = carregar();
  const registros = [
    { ID: "1452B004869", DESCRICAO: "Chuva forte em São Paulo", PROGRAMA: "JC" },
    { ID: "1452B004870", DESCRICAO: "Economia brasileira", PROGRAMA: "JC" }
  ];

  SearchEngine.pesquisar(registros, "chuva");
  SearchEngine.pesquisar(registros, "economia");

  assert.deepEqual(contadores(), {
    chamadasCreditos: 2,
    chamadasEnriquecimento: 2
  });
});

test("triagem preserva resultado encontrado somente por palavras distribuídas entre campos", () => {
  const { SearchEngine } = carregar();
  const registros = [
    {
      ID: "1452B004869",
      DESCRICAO: "Bombeiros atendem ocorrência",
      LOCAL: "Santos",
      PROGRAMA: "Jornal da Cultura"
    }
  ];

  const resultados = SearchEngine.pesquisar(registros, "bombeiros santos");
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].ID, "1452B004869");
});

test("triagem evita cálculo detalhado de segmentos para registros irrelevantes", () => {
  const { SearchEngine, chamadasSegmentos } = carregar();
  const registros = [
    { ID: "1452B004869", DESCRICAO: "Chuva forte em São Paulo", PROGRAMA: "JC" },
    { ID: "1452B004870", DESCRICAO: "Economia brasileira", PROGRAMA: "JC" },
    { ID: "1452B004871", DESCRICAO: "Campeonato de futebol", PROGRAMA: "JC" }
  ];

  const resultados = SearchEngine.pesquisar(registros, "chuva");

  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].ID, "1452B004869");
  assert.equal(chamadasSegmentos(), 1);
});
