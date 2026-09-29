import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/sincronizar-planilhas.yml", "utf8");

test("falha ao atualizar afiliadas não bloqueia geração de palavras-chave", () => {
  const trecho = workflow.match(/- name: Gerar snapshot de afiliadas e repórteres[\s\S]*?(?=\n\s*- name: Gerar palavras-chave e enriquecimento)/)?.[0] || "";
  assert.match(trecho, /continue-on-error:\s*true/);
  assert.match(workflow, /- name: Gerar palavras-chave e enriquecimento[\s\S]*?run:\s*npm run sync:keywords/);
});
