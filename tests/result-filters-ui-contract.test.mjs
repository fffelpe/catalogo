import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const htmlResultados = fs.readFileSync(fileURLToPath(new URL("../pages/resultado-busca.html", import.meta.url)), "utf8");
const htmlPrograma = fs.readFileSync(fileURLToPath(new URL("../pages/programa.html", import.meta.url)), "utf8");
const ui = fs.readFileSync(fileURLToPath(new URL("../js/catalogo-ui.js", import.meta.url)), "utf8");
const css = fs.readFileSync(fileURLToPath(new URL("../css/search-results-table.css", import.meta.url)), "utf8");

const CAMPOS = ["DATA", "LOCAL", "REPORTER", "AFILIADA_EMISSORA", "PROGRAMA", "EDITORIA"];

function validarFiltrosDaTabela(html, pagina) {
  for (const campo of CAMPOS) {
    assert.ok(html.includes(`data-filter-field="${campo}"`), `${pagina}: faltou filtro para ${campo}`);
  }
  assert.ok(html.includes('id="limparFiltrosTabela"'), `${pagina}: faltou botão para limpar filtros`);
  assert.ok(html.includes('id="filtroTabelaPopover"'), `${pagina}: faltou popover dos filtros`);
  assert.ok(html.includes('../js/result-filters.js'), `${pagina}: faltou carregar result-filters.js`);
}

test("página de resultados expõe filtros nas seis colunas solicitadas", () => {
  validarFiltrosDaTabela(htmlResultados, "resultado-busca.html");
});

test("páginas de programa expõem os mesmos filtros sem depender de uma busca digitada", () => {
  validarFiltrosDaTabela(htmlPrograma, "programa.html");
  assert.match(ui, /executarBusca\(termoInicial, programa, Boolean\(termoInicial\)\)/);
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
