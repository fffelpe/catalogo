import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homepage = readFileSync(new URL("../index.html", import.meta.url),"utf8");

test("página inicial mostra caixa de pesquisa e navegação por programas", () => {
  assert.match(homepage, /id="homeSearchForm"/);
  assert.match(homepage, /id="searchInput"/);
  assert.match(homepage, /aria-labelledby="tituloProgramas"/);
  for (const programa of ["Agrocultura", "Cartão Verde", "Documentários", "De olho no voto",
    "Jornal da Cultura", "Jornal da Tarde", "Opinião", "Repórter Eco", "Roda Viva"]) {
    assert.ok(homepage.includes(`programa=${programa}`), `Não encontrado: ${programa}`);
  }
  assert.doesNotMatch(homepage, /outras-emissoras|Imagens de outras emissoras/i);
});

test("home não carrega buscas populares nem últimos IDs", () => {
  assert.doesNotMatch(homepage, /buscas-populares\.js|buscas-populares-home|buscas-populares-geral/);
  assert.doesNotMatch(homepage, /ultimos-ids\.(?:css|js)|ultimosIdsPainel|ultimosIdsLista|Últimos IDs catalogados/);
});
