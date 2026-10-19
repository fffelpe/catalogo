import fs from "node:fs/promises";
import path from "node:path";

export function compilarRelatorioConflitos({ etapa, conflitos = [], geradoEm = new Date().toISOString() } = {}) {
  if (!etapa || !Array.isArray(conflitos)) throw new Error("Etapa e conflitos são obrigatórios.");
  const itens = conflitos.map(({ ids, fonte, linhaImgs, campo, existente, recebido }) => ({
    ids: String(ids || "").trim(),
    fonte: String(fonte || etapa).trim(),
    linhaImgs: Number.isInteger(linhaImgs) ? linhaImgs : null,
    campo: String(campo || "").trim(),
    existente: String(existente ?? ""),
    recebido: String(recebido ?? "")
  }));
  const contar = (campo) => Object.fromEntries(
    [...new Set(itens.map((item) => item[campo]))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"))
      .map((nome) => [nome, itens.filter((item) => item[campo] === nome).length])
  );
  const idsUnicos = [...new Set(itens.flatMap((item) => item.ids.split(/[\s,;+|/]+/).filter(Boolean)))];
  return {
    schemaVersion: 1, etapa, geradoEm,
    resumo: { totalConflitos: itens.length, totalMediaIds: idsUnicos.length, porFonte: contar("fonte"), porCampo: contar("campo") },
    conflitos: itens
  };
}

export async function salvarRelatorioConflitos(arquivo, dados) {
  const relatorio = compilarRelatorioConflitos(dados);
  await fs.mkdir(path.dirname(arquivo), { recursive: true });
  await fs.writeFile(arquivo, JSON.stringify(relatorio, null, 2) + "\n", "utf8");
  console.log(`Auditoria ${relatorio.etapa}: ${relatorio.resumo.totalConflitos} conflitos, ${relatorio.resumo.totalMediaIds} Media IDs; relatório salvo em ${arquivo}.`);
  return relatorio;
}
