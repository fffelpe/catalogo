import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const html = fs.readFileSync(fileURLToPath(new URL("../pages/resultado-busca.html", import.meta.url)), "utf8");
const ui = fs.readFileSync(fileURLToPath(new URL("../js/catalogo-ui.js", import.meta.url)), "utf8");
const css = fs.readFileSync(fileURLToPath(new URL("../css/search-results-table.css", import.meta.url)), "utf8");

test("cabeçalho da tabela expõe filtros nas seis colunas solicitadas", () => {
  for (const campo of ["DATA", "LOCAL", "REPORTER", "AFILIADA_EMISSORA", "PROGRAMA", "EDITORIA"]) {
    assert.ok(html.includes(`data-filter-field="${campo}"`), `faltou filtro para ${campo}`);
  }
  assert.ok(html.includes('id="limparFiltrosTabela"'));
  assert.ok(html.includes('../js/result-filters.js'));
});

test("catalogo-ui aplica filtros sobre o resultado-base e reinicia paginação", () => {
  assert.ok(ui.includes("let resultadosBase = []"));
  assert.ok(ui.includes("function aplicarFiltrosTabela"));
  assert.ok(ui.includes("ResultFilters.aplicar(resultadosBase"));
  assert.ok(ui.includes("paginaAtual = 0"));
});

test("interface marca filtro ativo e possui popover acessível", () => {
  assert.ok(css.includes(".btn-filtro-coluna.filtro-ativo"));
  assert.ok(css.includes(".filtro-tabela-popover"));
  assert.ok(css.includes(".filtro-opcoes-lista"));
});
