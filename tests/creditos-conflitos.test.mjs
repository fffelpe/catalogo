import test from "node:test";
import assert from "node:assert/strict";
import {
  arquivoEhOficial,
  extrairMediaIdDoNome,
  resolverCandidatosCredito
} from "../scripts/creditos-conflitos.mjs";

function arquivo(name, id = name) {
  return { id, name, mimeType: "application/pdf", modifiedTime: "2026-09-18T12:00:00Z" };
}

test("extrai Media ID mesmo quando o nome contém marcador OFICIAL", () => {
  assert.equal(extrairMediaIdDoNome("1452B005138 - OFICIAL.docx"), "1452B005138");
  assert.equal(extrairMediaIdDoNome("1452B005138 [OFICIAL].pdf"), "1452B005138");
});

test("reconhece marcador OFICIAL como palavra isolada", () => {
  assert.equal(arquivoEhOficial(arquivo("1452B005138 - OFICIAL.docx")), true);
  assert.equal(arquivoEhOficial(arquivo("1452B005138.pdf")), false);
});

test("aceita normalmente um único documento", () => {
  const unico = arquivo("1452B005138.pdf");
  const resultado = resolverCandidatosCredito("1452B005138", [unico]);
  assert.equal(resultado.tipo, "unico");
  assert.equal(resultado.escolhido, unico);
});

test("em duplicidade escolhe somente a única versão explicitamente OFICIAL", () => {
  const antigo = arquivo("1452B005138.pdf", "antigo");
  const oficial = arquivo("1452B005138 - OFICIAL.docx", "oficial");
  const resultado = resolverCandidatosCredito("1452B005138", [antigo, oficial]);
  assert.equal(resultado.tipo, "oficial");
  assert.equal(resultado.escolhido, oficial);
});

test("duplicidade sem OFICIAL vira conflito e não escolhe arquivo", () => {
  const resultado = resolverCandidatosCredito("1452B005138", [
    arquivo("1452B005138.pdf", "a"),
    arquivo("1452B005138.docx", "b")
  ]);
  assert.equal(resultado.tipo, "conflito");
  assert.equal(resultado.escolhido, null);
  assert.match(resultado.motivo, /sem versão oficial/i);
});

test("mais de um OFICIAL também vira conflito", () => {
  const resultado = resolverCandidatosCredito("1452B005138", [
    arquivo("1452B005138 - OFICIAL.pdf", "a"),
    arquivo("1452B005138 [OFICIAL].docx", "b")
  ]);
  assert.equal(resultado.tipo, "conflito");
  assert.equal(resultado.escolhido, null);
  assert.equal(resultado.oficiais.length, 2);
});
