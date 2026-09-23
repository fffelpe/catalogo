function limparCelula(valor) {
  return String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function linhaParaRegistro(linha = []) {
  return {
    ID: limparCelula(linha[0]),
    DESCRICAO: limparCelula(linha[1]),
    DATA: limparCelula(linha[2]),
    LOCAL: limparCelula(linha[3]),
    REPORTER: limparCelula(linha[4]),
    AFILIADA_EMISSORA: limparCelula(linha[5]),
    PROGRAMA: limparCelula(linha[6]),
    EDITORIA: limparCelula(linha[7]),
    PGM: "",
  };
}

export function criarSnapshotCatalogo(linhas = [], opcoes = {}) {
  const registros = (Array.isArray(linhas) ? linhas : [])
    .map(linhaParaRegistro)
    .filter((registro) => registro.ID);

  if (!registros.length) {
    throw new Error("Snapshot do catálogo sem nenhum registro válido; publicação cancelada.");
  }

  return {
    schemaVersion: 1,
    generatedAt: opcoes.generatedAt || new Date().toISOString(),
    total: registros.length,
    registros,
  };
}
