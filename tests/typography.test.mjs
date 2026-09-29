import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const mainCssPath = fileURLToPath(new URL("../css/main.css", import.meta.url));

function css() {
  return fs.readFileSync(mainCssPath, "utf8");
}

test("catálogo usa IBM Plex Sans como fonte principal", () => {
  const source = css();
  assert.match(source, /IBM\+Plex\+Sans/i);
  assert.match(source, /font-family:\s*["']IBM Plex Sans["']/i);
  assert.doesNotMatch(source, /IBM Plex Sans JP/i);
});

test("toda a interface é exibida em caixa alta", () => {
  const source = css();
  assert.match(source, /body\s*\{[^}]*text-transform:\s*uppercase/si);
  assert.match(source, /input[^\{]*\{[^}]*text-transform:\s*uppercase/si);
});

test("Media IDs usam IBM Plex Mono", () => {
  const source = css();
  assert.match(source, /IBM\+Plex\+Mono/i);
  assert.match(source, /\.id-text[^\{]*\{[^}]*font-family:\s*["']IBM Plex Mono["']/si);
});
