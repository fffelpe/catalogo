import { extrairMediaIds } from "./media-id.mjs";

// Só remove uma linha se TODOS os campos A:I forem idênticos.
// A coluna I (PGM) faz parte dos metadados, mesmo que a importação só atualize A:H.
export function identificarLinhasDuplicadas(linhas = [], pgmPorLinha = []) {
  const vistos = new Set();
  const duplicadas = [];

  linhas.forEach((linha, indice) => {
    if (!extrairMediaIds(linha?.[0]).length) return;
    const chave = JSON.stringify([...(linha || []), String(pgmPorLinha[indice] || "").trim()]);
    if (vistos.has(chave)) duplicadas.push(indice + 2);
    else vistos.add(chave);
  });

  return duplicadas;
}
