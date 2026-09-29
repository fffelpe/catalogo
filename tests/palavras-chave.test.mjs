import test from "node:test";
import assert from "node:assert/strict";
import {
  gerarEnriquecimentoCatalogo,
  gerarEnriquecimentoRegistro,
} from "../scripts/palavras-chave.mjs";

const registroCafe = {
  ID: "1452B005485",
  DESCRICAO: "FLORADA DO CAFÉ + CAFEZAIS COM FLORES BRANCAS + COLHEITA DE CAFÉ + EXPORTAÇÕES DE CAFÉ + SAFRA DE CAFÉ + PRODUTOR RURAL + FAZENDA EM ANDRADAS + DRONE EM PLANTAÇÃO DE CAFÉ + OFF + VOLTA SEM GC + ID GIGANTE",
  LOCAL: "ANDRADAS - MG",
  REPORTER: "JOÃO RAFAEL DE OLIVEIRA",
  AFILIADA_EMISSORA: "ANTV",
  PROGRAMA: "AGROCULTURA",
  EDITORIA: "AGRONEGÓCIO",
};

const creditoCafe = {
  materia: "A florada do café marca o início da formação dos frutos e de uma nova safra.",
  fontes: [
    { nome: "Ricardo Teixeira Giordani - produtor de café", cargo: "Produtor de café" },
    { nome: "IMAGENS", cargo: "DIVULGAÇÃO" },
  ],
  creditos: {},
  textoCompleto: "OFF: cafezais cobertos de flores brancas. Exportações de café seguem em alta. Boa colheita na nova safra. VOLTA SEM GC.",
};

const afiliadas = {
  afiliadas: [
    { id: "AFL005", nome: "ANTV", uf: "MINAS GERAIS - MG", cidade: "ANDRADAS", ativa: true },
  ],
  reporteres: [
    { id: "REP020", nome: "JOÃO RAFAEL DE OLIVEIRA", afiliadaId: "AFL005", funcao: "REPÓRTER", ativo: true },
  ],
};

test("gera de 8 a 15 palavras-chave automáticas relevantes para um registro rico", () => {
  const item = gerarEnriquecimentoRegistro(registroCafe, creditoCafe, {}, afiliadas);

  assert.ok(item.autoKeywords.length >= 8, `esperava ao menos 8, recebeu ${item.autoKeywords.length}`);
  assert.ok(item.autoKeywords.length <= 15, `esperava no máximo 15, recebeu ${item.autoKeywords.length}`);

  for (const termo of ["florada do café", "colheita de café", "exportações de café", "safra de café", "agronegócio"]) {
    assert.ok(item.autoKeywords.includes(termo), `palavra-chave ausente: ${termo}`);
  }
});

test("remove marcadores técnicos e termos sem valor editorial", () => {
  const item = gerarEnriquecimentoRegistro(registroCafe, creditoCafe, {}, afiliadas);
  const todos = item.autoKeywords.join(" | ").toLocaleLowerCase("pt-BR");

  for (const proibido of ["off", "volta", "sem gc", "id gigante", "divulgação", "imagens"]) {
    assert.equal(todos.includes(proibido), false, `termo técnico não deveria virar keyword: ${proibido}`);
  }
});

test("preserva palavras-chave manuais e substitui apenas as automáticas antigas", () => {
  const anterior = {
    keywords: ["café especial", "termo automático antigo"],
    manualKeywords: ["café especial"],
    autoKeywords: ["termo automático antigo"],
    subjects: ["Agronegócio"],
    people: [],
    places: [],
    segments: [],
  };

  const item = gerarEnriquecimentoRegistro(registroCafe, creditoCafe, anterior, afiliadas);

  assert.ok(item.manualKeywords.includes("café especial"));
  assert.ok(item.keywords.includes("café especial"));
  assert.equal(item.keywords.includes("termo automático antigo"), false);
});

test("preserva keywords legadas como manuais quando ainda não existe proveniência automática", () => {
  const anterior = {
    keywords: ["termo editorial aprovado"],
    subjects: [],
    people: [],
    places: [],
    segments: [],
  };

  const item = gerarEnriquecimentoRegistro(registroCafe, creditoCafe, anterior, afiliadas);
  assert.deepEqual(item.manualKeywords, ["termo editorial aprovado"]);
  assert.ok(item.keywords.includes("termo editorial aprovado"));
});

test("enriquece pessoas e lugares usando repórter, créditos e cadastro de afiliadas", () => {
  const item = gerarEnriquecimentoRegistro(registroCafe, creditoCafe, {}, afiliadas);

  assert.ok(item.people.some((valor) => valor === "JOÃO RAFAEL DE OLIVEIRA"));
  assert.ok(item.people.some((valor) => valor === "Ricardo Teixeira Giordani"));
  assert.ok(item.places.some((valor) => valor === "ANDRADAS - MG"));
  assert.ok(item.places.some((valor) => valor === "MINAS GERAIS - MG"));
});

test("não cria enriquecimento para Media ID que existe apenas nos créditos", () => {
  const snapshot = gerarEnriquecimentoCatalogo({
    registros: [registroCafe],
    creditos: {
      "1452B005485": creditoCafe,
      "9999B999999": { textoCompleto: "material órfão" },
    },
    anterior: { schemaVersion: 1, items: {} },
    afiliadas,
    generatedAt: "2026-09-29T20:00:00.000Z",
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.generatedAt, "2026-09-29T20:00:00.000Z");
  assert.ok(snapshot.items["1452B005485"]);
  assert.equal(snapshot.items["9999B999999"], undefined);
});
