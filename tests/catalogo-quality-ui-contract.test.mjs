import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(new URL("../pages/qualidade.html", import.meta.url));

test("painel de qualidade expõe resumo, filtros e tabela", () => {
  assert.ok(fs.existsSync(pagePath), "pages/qualidade.html deve existir");
  const html = fs.readFileSync(pagePath, "utf8");

  for (const id of [
    "qualitySummary",
    "qualityProgramFilter",
    "qualitySeverityFilter",
    "qualityTypeFilter",
    "qualityTableBody"
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  for (const script of [
    "media-id.js",
    "dados.js",
    "media-enrichment.js",
    "catalogo-quality.js",
    "catalogo-quality-ui.js"
  ]) {
    assert.ok(html.includes(script), `${script} deve ser carregado`);
  }
});
