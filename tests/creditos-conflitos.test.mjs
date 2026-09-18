import test from "node:test";
import assert from "node:assert/strict";
import {
  arquivoEhOficial,
  extrairMediaIdDoNome,
  resolverCandidatosCredito,
  avaliarNovidadeConflito,
  instrucoesParaConflito
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

test("conflito legado não é marcado como novo se os mesmos arquivos já estavam registrados", () => {
  const arquivos = [arquivo("1452B005138.pdf", "a"), arquivo("1452B005138.docx", "b")];
  const status = {
    conflitos: [{
      id: "1452B005138",
      bloqueante: false,
      arquivos: [{ id: "a" }, { id: "b" }]
    }]
  };
  const resultado = avaliarNovidadeConflito("1452B005138", arquivos, status, null);
  assert.equal(resultado.novo, false);
  assert.equal(resultado.bloqueante, false);
  assert.equal(resultado.novosArquivos.length, 0);
});

test("novo arquivo que agrava duplicidade ativa rejeição bloqueante", () => {
  const arquivos = [
    arquivo("1452B005138.pdf", "a"),
    arquivo("1452B005138.docx", "b"),
    arquivo("1452B005138.txt", "c")
  ];
  const status = {
    conflitos: [{
      id: "1452B005138",
      bloqueante: false,
      arquivos: [{ id: "a" }, { id: "b" }]
    }]
  };
  const resultado = avaliarNovidadeConflito("1452B005138", arquivos, status, null);
  assert.equal(resultado.novo, true);
  assert.equal(resultado.bloqueante, true);
  assert.deepEqual(resultado.novosArquivos.map((item) => item.id), ["c"]);
});

test("novo conflito criado a partir de um documento antes único é bloqueante", () => {
  const arquivos = [arquivo("1452B005138.pdf", "a"), arquivo("1452B005138.docx", "b")];
  const creditoAnterior = { arquivo: { id: "a" } };
  const resultado = avaliarNovidadeConflito("1452B005138", arquivos, {}, creditoAnterior);
  assert.equal(resultado.novo, true);
  assert.equal(resultado.bloqueante, true);
  assert.deepEqual(resultado.novosArquivos.map((item) => item.id), ["b"]);
});

test("conflito bloqueante permanece bloqueante até ser resolvido", () => {
  const arquivos = [arquivo("1452B005138.pdf", "a"), arquivo("1452B005138.docx", "b")];
  const status = {
    conflitos: [{
      id: "1452B005138",
      bloqueante: true,
      arquivos: [{ id: "a" }, { id: "b" }]
    }]
  };
  const resultado = avaliarNovidadeConflito("1452B005138", arquivos, status, null);
  assert.equal(resultado.novo, false);
  assert.equal(resultado.bloqueante, true);
});

test("gera instruções claras para conflito sem versão oficial", () => {
  const resolucao = resolverCandidatosCredito("1452B005138", [
    arquivo("1452B005138.pdf", "a"),
    arquivo("1452B005138.docx", "b")
  ]);
  const instrucoes = instrucoesParaConflito("1452B005138", resolucao);
  assert.ok(instrucoes.length >= 4);
  assert.match(instrucoes.join(" "), /1452B005138 - OFICIAL/);
  assert.match(instrucoes.join(" "), /versão anterior/i);
});
