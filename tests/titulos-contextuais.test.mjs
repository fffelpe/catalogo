import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function carregar() {
  const ctx = { console };
  vm.createContext(ctx);
  for (const [arquivo, nome] of [
    ["media-id.js", "MediaIdUtils"],
    ["sinonimos.js", "VocabularioJornalistico"],
    ["search-engine.js", "SearchEngine"],
    ["titulos-contextuais.js", "TitulosContextuais"]
  ]) {
    const codigo = fs.readFileSync(new URL("../js/" + arquivo, import.meta.url),"utf8");
    vm.runInContext(codigo + "\nglobalThis." + nome + " = " + nome + ";",ctx);
  }
  return ctx;
}

test("título resumido: fachada do Palácio sem complemento de iluminação", () => {
  const {TitulosContextuais:t} = carregar();
  const original="Fachada do Palácio do Planalto com Iluminação Rosa Pelo Outubro Rosa";
  assert.equal(t.resumir(original), "Fachada Palácio do Planalto");
  assert.equal(t.adaptar(original,"fachada do palácio no outubro rosa"),
    "Fachada do palácio no outubro rosa");
  assert.equal(t.adaptar(original,"fachada do palácio iluminado de azul"),"");
});

test("prisão domiciliar casa com preso em casa mas não inventa prisão em outro material", () => {
  const {TitulosContextuais:t,SearchEngine:busca} = carregar();
  const descricao="Jair Bolsonaro Atras do Portao — Jair Bolsonaro Preso em Casa";
  assert.equal(t.resumir(descricao),"Jair Bolsonaro Atras do Portao");
  assert.equal(t.adaptar(descricao,"jair bolsonaro em prisão domiciliar"),
    "Jair bolsonaro em prisão domiciliar");
  assert.equal(t.adaptar("Jair Bolsonaro em coletiva de imprensa",
    "jair bolsonaro em prisão domiciliar"),"");
  const registros=[
    {ID:"1452B005041",DESCRICAO:"Jair Bolsonaro em coletiva de imprensa"},
    {ID:"1452B005040",DESCRICAO:descricao},
    {ID:"1452B005042",DESCRICAO:"Outro político preso em casa"}
  ];
  const resultado=busca.pesquisar(registros,"jair bolsonaro em prisão domiciliar");
  assert.equal(resultado[0]?.ID,"1452B005040");
  assert.equal(registros[1].DESCRICAO,descricao,"a fonte deve permanecer intacta");
});

test("correspondências contextuais comuns e filtro de pedidos genéricos", () => {
  const {TitulosContextuais:t}=carregar();
  assert.equal(t.adaptar("Ruas alagadas no centro","quero imagens de enchentes"),"Enchentes");
  assert.equal(t.adaptar("Imagem aérea de plantação de soja",
    "quero imagens de soja com vista de cima"),"Soja com vista de cima");
  assert.equal(t.adaptar("Rua alagada","quero imagens de enchentes com resgate"),"");
  assert.equal(t.adaptar("Fachada Palácio","1452B005000"),"");
});

test("títulos mudam somente na interface, não no índice ou na planilha", () => {
  const ui=fs.readFileSync(new URL("../js/catalogo-ui.js",import.meta.url),"utf8");
  const cssCard=fs.readFileSync(new URL("../js/figma-id-cards.js",import.meta.url),"utf8");
  const mainCard=fs.readFileSync(new URL("../js/search-results-cards.js",import.meta.url),"utf8");
  assert.match(ui,/data-titulo-contextual/);
  assert.match(ui,/TitulosContextuais\.adaptar/);
  assert.match(cssCard,/dataset\.tituloModo/);
  assert.match(mainCard,/TitulosContextuais\.resumir/);
  for (const page of ["programa.html","resultado-busca.html"]) {
    const html=fs.readFileSync(new URL("../pages/"+page,import.meta.url),"utf8");
    assert.ok(html.includes("titulos-contextuais.js"));
  }
});
