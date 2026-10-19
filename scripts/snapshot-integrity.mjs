// Impede que falhas transitórias nas fontes substituam um acervo íntegro por um snapshot parcial.
// Não bloqueia acréscimos, nem pequenas exclusões editoriais deliberadas.
function contarDuracoes(snapshot) {
  const ids = new Set();
  for (const registro of snapshot?.registros || []) {
    const duracoes = registro?.DURACOES;
    if (!duracoes || typeof duracoes !== "object" || Array.isArray(duracoes)) continue;
    for (const [id, valor] of Object.entries(duracoes)) {
      if (String(valor ?? "").trim()) ids.add(id);
    }
  }
  return ids.size;
}

export function validarRegressaoSnapshot(atual, anterior = null, opcoes = {}) {
  const quedaMaxima = Number(opcoes.quedaMaxima ?? 0.15);
  const minimoBase = Number(opcoes.minimoBase ?? 100);
  if (!Number.isFinite(quedaMaxima) || quedaMaxima < 0 || quedaMaxima >= 1) {
    throw new Error("Limite de queda do snapshot inválido.");
  }
  if (!Array.isArray(atual?.registros) || atual.total !== atual.registros.length || atual.total < 1) {
    throw new Error("Snapshot atual inconsistente ou vazio.");
  }

  const duracoes = contarDuracoes(atual);
  if (!anterior) return { total: atual.total, duracoes, comparado: false };
  if (!Array.isArray(anterior.registros) || anterior.total !== anterior.registros.length) {
    throw new Error("Snapshot anterior inválido; revisão necessária antes de sobrescrever.");
  }

  const totalAnterior = anterior.total;
  const duracoesAnteriores = contarDuracoes(anterior);
  const caiuDemais = (atualQuantidade, anteriorQuantidade) =>
    anteriorQuantidade >= minimoBase && atualQuantidade < Math.ceil(anteriorQuantidade * (1 - quedaMaxima));

  if (caiuDemais(atual.total, totalAnterior)) {
    throw new Error(
      `Queda abrupta no acervo: ${totalAnterior} → ${atual.total} registros. Publicação bloqueada para evitar perda de dados.`
    );
  }
  if (caiuDemais(duracoes, duracoesAnteriores)) {
    throw new Error(
      `Queda abrupta nas durações: ${duracoesAnteriores} → ${duracoes} Media IDs com duração. Publicação bloqueada para evitar perda de metadados.`
    );
  }

  return { total: atual.total, duracoes, comparado: true, totalAnterior, duracoesAnteriores };
}
