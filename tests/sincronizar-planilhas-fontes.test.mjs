import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { programaPorMediaId, normalizarMediaId } from "../scripts/programa-por-prefixo.mjs";

const SCRIPT = new URL("../scripts/sincronizar-planilhas.mjs", import.meta.url);
const INTEGRACAO_AGRO = new URL("../scripts/sincronizar-noticias-agrocultura.mjs", import.meta.url);
const GERADOR_AGRO = new URL("../scripts/gerar-acervo-agrocultura.mjs", import.meta.url);
const GERADOR_CATALOGO = new URL("../scripts/gerar-snapshot-catalogo.mjs", import.meta.url);
const BUSCA = new URL("../js/search-engine.js", import.meta.url);

test("inclui De Olho no Voto como fonte permanente de sincronização", async () => {
  const conteudo = await readFile(SCRIPT, "utf8");

  assert.match(conteudo, /nome:\s*["']De Olho no Voto["']/);
  assert.match(conteudo, /spreadsheetId:\s*["']1R6vI1r78DoXykV_5oGu_uVq1MVf6lmpEx_XZ8eM1Lbs["']/);
  assert.match(conteudo, /range:\s*["']Página1!A2:H["']/);
});

test("inclui documentos do jornalismo e matérias não exibidas como fontes permanentes", async () => {
  const conteudo = await readFile(SCRIPT, "utf8");

  assert.match(conteudo, /nome:\s*["']Documentos Jornalismo["']/);
  assert.match(conteudo, /spreadsheetId:\s*["']1-HU6N_9OVWiNkPAMuevUcyFa32ocDA_uFMyAh7m9PTo["']/);
  assert.match(conteudo, /nome:\s*["']Matérias que não foram ao ar["']/);
  assert.match(conteudo, /spreadsheetId:\s*["']1snKWDdgFQ1T-AXdEU6Hof9V2B56v5qkQKfUjrzobtGU["']/);
});

test("remove da fonte Agrocultura IDs que já foram usados em matérias ou notícias", async () => {
  const conteudo = await readFile(SCRIPT, "utf8");

  assert.match(conteudo, /PLANILHA_MATERIAS_ID\s*=\s*["']1Ny0gjt-4du7cJ-ejgahfhdplnCBl58d6RV7kfuLjKM0["']/);
  assert.match(conteudo, /PLANILHA_NOTICIAS_ID\s*=\s*["']1LIkpJyIxTV7o4Zz1uJ90ZZTDfedTNsihfJB14CsewRw["']/);
  assert.match(conteudo, /async function removerAgroculturaJaUtilizados/);
  assert.match(conteudo, /deleteDimension/);
});

test("integra MATÉRIAS QUE FORAM AO AR no índice global sem sobrescrever metadados existentes", async () => {
  const conteudo = await readFile(INTEGRACAO_AGRO, "utf8");

  assert.match(conteudo, /PLANILHA_MATERIAS_ID\s*=\s*["']1Ny0gjt-4du7cJ-ejgahfhdplnCBl58d6RV7kfuLjKM0["']/);
  assert.match(conteudo, /ABAS_MATERIAS\s*=\s*\[[^\]]*"2019"[^\]]*"2026"[^\]]*\]/s);
  assert.match(conteudo, /ABA_FAUSTINO\s*=\s*["']VTS FAUSTINO["']/);
  assert.match(conteudo, /somentePreencherVazios:\s*true/);
});

test("conflito de múltiplos IDs já distribuídos não pode abortar toda a integração", async () => {
  const conteudo = await readFile(INTEGRACAO_AGRO, "utf8");
  assert.doesNotMatch(conteudo, /throw new Error\(`Os IDs \$\{ids\.join\(", "\)\} do mesmo registro já pertencem a linhas diferentes na imgs\.`\)/);
  assert.match(conteudo, /conflitosDistribuidos/);
  assert.match(conteudo, /preservarIdsDoAlvo/);
});

test("preserva PGM de NOTÍCIAS no snapshot e permite pesquisar pelo número do programa", async () => {
  const [integracao, gerador, busca] = await Promise.all([
    readFile(INTEGRACAO_AGRO, "utf8"),
    readFile(GERADOR_CATALOGO, "utf8"),
    readFile(BUSCA, "utf8"),
  ]);

  assert.match(integracao, /limparTexto\(linha\[0\]\)/);
  assert.match(gerador, /imgs!A2:I/);
  assert.match(busca, /PGM:\s*18/);
});

test("normaliza Media ID para maiúsculas", () => {
  assert.equal(normalizarMediaId("2370e001234"), "2370E001234");
  assert.equal(normalizarMediaId(" 1452b004318 "), "1452B004318");
});

test("mapeia todos os prefixos conhecidos para o programa correto", () => {
  const casos = new Map([
    ["1452B004318", "AGROCULTURA"],
    ["1452E004318", "AGROCULTURA"],
    ["2457B001234", "JORNAL DA CULTURA"],
    ["1009E001234", "JORNAL DA CULTURA"],
    ["2370B001234", "JORNAL DA CULTURA"],
    ["2458E001234", "JORNAL DA CULTURA"],
    ["2822B001234", "JORNAL DA TARDE"],
    ["3293E001234", "DE OLHO NO VOTO"],
    ["3184B001234", "DE OLHO NO VOTO"],
    ["3027E001234", "DE OLHO NO VOTO"],
    ["2712B001234", "DE OLHO NA EDUCAÇÃO"],
    ["2922E001234", "DOCUMENTÁRIOS"],
    ["0205B001234", "REPÓRTER ECO"],
  ]);

  for (const [id, esperado] of casos) {
    assert.equal(programaPorMediaId(id), esperado, id);
  }
});

test("usa PROGRAMA NAO DEFINIDO quando o prefixo não está mapeado", () => {
  assert.equal(programaPorMediaId("9999B001234"), "PROGRAMA NAO DEFINIDO");
});

test("preserva o programa existente quando não consegue inferir pelo Media ID", async () => {
  const conteudo = await readFile(SCRIPT, "utf8");
  assert.match(conteudo, /programaPorListaDeIds\(ids,\s*resultado\[6\]\)/);
  assert.match(conteudo, /programaPorListaDeIds\(separarIds\(resultado\[0\]\),\s*resultado\[6\]\)/);
});

test("bloqueia a geração do snapshot AgroCultura quando qualquer fonte principal falha", async () => {
  const conteudo = await readFile(GERADOR_AGRO, "utf8");
  assert.match(conteudo, /falhasFontes/);
  assert.match(conteudo, /Snapshot AgroCultura não publicado/);
  assert.match(conteudo, /parcial:\s*false/);
});
