import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  desmembrarPorMediaId,
  consolidarPorMediaId,
  classificarAcervoAgrocultura,
} from "../scripts/agrocultura-classificacao.mjs";

const registro = (id, descricao, extras = {}) => ({ id, descricao, ...extras });

test("separa múltiplos Media IDs independentemente dos delimitadores", () => {
  const resultados = desmembrarPorMediaId([
    registro("1452B005344 1452B005345\n1452B005346 / 1452B005344", "plantação", { data: "26/07/2026" }),
  ]);
  assert.deepEqual(resultados.map((x) => x.id), ["1452B005344", "1452B005345", "1452B005346"]);
  assert.ok(resultados.every((x) => x.data === "26/07/2026"));
  assert.ok(resultados.every((x) => x.ids.length === 1));
});

test("remove repetidos somente dentro da categoria, sem perder metadados", () => {
  const resultados = consolidarPorMediaId([
    registro("1452B005520", "colheita", { reporter: "" }),
    registro(" 1452B005520 ", "outra descrição", { reporter: "KELLY MARTINS" }),
  ]);
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].descricao, "colheita");
  assert.equal(resultados[0].reporter, "KELLY MARTINS");
});

test("mantém VTs e notícias e retira os mesmos IDs apenas da cobertura", () => {
  const dados = classificarAcervoAgrocultura({
    vts: [registro("1452B001822", "VT feijão")],
    noticias: [registro("1452B005469", "Notícia"), registro("1452B001822", "Notícia reprise")],
    coberturas: [
      registro("1452B001822", "cobertura do VT"),
      registro("1452B005469 / 1452B005520", "notícia e imagens"),
      registro("1452B005520", "imagem duplicada"),
      registro("1452B005521", "imagem inédita"),
    ],
  });
  assert.deepEqual(dados.vts.map(x => x.id), ["1452B001822"]);
  assert.deepEqual(dados.noticias.map(x => x.id), ["1452B005469", "1452B001822"]);
  assert.deepEqual(dados.coberturas.map(x => x.id), ["1452B005520", "1452B005521"]);
  assert.equal(dados.removidosDaCobertura, 2);
});

test("garante leitura por cabeçalho de todas as abas e três fontes de cobertura", async () => {
  const gerador = await readFile(new URL("../scripts/gerar-acervo-agrocultura.mjs", import.meta.url), "utf8");
  assert.match(gerador, /const ABAS_VTS = \["2019".*"2026"\]/);
  assert.match(gerador, /ABA_FAUSTINO = "VTS FAUSTINO"/);
  assert.match(gerador, /coluna\(linha, cabecalho, "ID"/);
  assert.match(gerador, /Number\(aba\) <= 2022 \? "E" : "F"/);
  assert.match(gerador, /carregarFonteAgrocultura/);
  assert.match(gerador, /fonte_agrocultura/);
  assert.match(gerador, /classificarAcervoAgrocultura/);
});

test("não apaga linhas da fonte AgroCultura no sincronizador", async () => {
  const codigo = await readFile(new URL("../scripts/sincronizar-planilhas.mjs", import.meta.url), "utf8");
  const bloco = codigo.split("async function removerAgroculturaJaUtilizados() {")[1]?.split("async function main() {")[0];
  assert.ok(bloco);
  assert.doesNotMatch(bloco, /batchUpdate|deleteDimension|values\.update/);
  assert.match(bloco, /fonte original|planilha de origem preservada/i);
});

test("página disponibiliza cards paginados com filtro e opção Ver mais", async () => {
  const [html, interfaceCodigo, css] = await Promise.all([
    readFile(new URL("../pages/programa.html", import.meta.url), "utf8"),
    readFile(new URL("../js/mam-agrocultura.js", import.meta.url), "utf8"),
    readFile(new URL("../css/mam-agrocultura.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /data-agro-tipo="vt"/);
  assert.match(html, /Notícias e Outras Notícias/);
  assert.match(html, /Imagens de Cobertura/);
  assert.match(html, /agroCarregarMais/);
  assert.match(interfaceCodigo, /normalizarCategorias/);
  assert.match(interfaceCodigo, /limiteVisivel = 40/);
  assert.match(interfaceCodigo, /searchInput/);
  assert.match(css, /repeat\(5, minmax\(0, 1fr\)\)/);
});
