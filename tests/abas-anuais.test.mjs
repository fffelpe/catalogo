import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  selecionarAbasAnuaisOuLegada, listarAbasAnuaisOuLegada, intervaloDaAba
} from "../scripts/abas-anuais.mjs";

const aba = (title, props={}) => ({properties:{title,...props}});
test("agrega abas anuais, respeita ordem e aceita novos anos", () => {
  const tabs=[aba("2026"),aba("2023"),aba("2025"),aba("2024"),aba("2027")];
  assert.deepEqual(selecionarAbasAnuaisOuLegada(tabs,"NOTÍCIAS E OUTRAS NOTÍCIAS"),
    ["2023","2024","2025","2026","2027"]);
});
test("fonte AgroCultura anual e legado são identificados", () => {
  assert.deepEqual(selecionarAbasAnuaisOuLegada([aba("2026"),aba("2025")],"fonte_agrocultura"),["2025","2026"]);
  assert.deepEqual(selecionarAbasAnuaisOuLegada([aba("NOTÍCIAS E OUTRAS NOTÍCIAS QUE FORAM AO AR")],
    "NOTICIAS E OUTRAS NOTICIAS"),["NOTÍCIAS E OUTRAS NOTÍCIAS QUE FORAM AO AR"]);
});
test("oculta abas escondidas e explica a ausência de fonte", () => {
  assert.deepEqual(selecionarAbasAnuaisOuLegada([aba("2025",{hidden:true}),aba("2026")],"fonte_agrocultura"),["2026"]);
  assert.throws(() => selecionarAbasAnuaisOuLegada([aba("Outros")],"fonte_agrocultura"),
    /Abas disponíveis: Outros/);
});
test("metadados antes dos dados e intervalos válidos", async () => {
  const sheets={spreadsheets:{get:async () => ({data:{sheets:[aba("2026"),aba("2025")]}})}};
  assert.deepEqual(await listarAbasAnuaisOuLegada(sheets,"sheetid","fonte_agrocultura"),["2025","2026"]);
  assert.equal(intervaloDaAba("2026","A2:H"),"'2026'!A2:H");
  assert.equal(intervaloDaAba("O'Reilly","A1:I"),"'O''Reilly'!A1:I");
});
test("scripts leem fontes em abas anuais e workflow não duplica status", () => {
  const read = (name) => readFileSync(new URL("../scripts/"+name,import.meta.url),"utf8");
  const noticias=read("sincronizar-noticias-agrocultura.mjs");
  const fontes=read("sincronizar-planilhas.mjs");
  const gerador=read("gerar-acervo-agrocultura.mjs");
  const preparar=read("preparar-colunas-media-id.mjs");
  for(const source of [noticias,fontes,gerador]) assert.match(source,/listarAbasAnuaisOuLegada/);
  assert.match(fontes,/abasAnuais: true/);
  assert.match(gerador,/origem: "fonte_agrocultura"/);
  assert.match(preparar,/selecionarAbasAnuaisOuLegada/);
  const yml=readFileSync(new URL("../.github/workflows/sincronizar-planilhas.yml",import.meta.url),"utf8");
  assert.equal((yml.match(/- name: Atualizar indicadores horários da sincronização/g)||[]).length,1);
});
