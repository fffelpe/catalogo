const MEDIA_ID_EXATO = /^\d{4}[A-Z]\d{5,6}$/i;
const MEDIA_ID_NO_TEXTO = /(?<![A-Z0-9])\d{4}[A-Z]\d{5,6}(?![A-Z0-9])/gi;

function limparCelula(valor) {
  return String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function normalizarMediaId(valor) {
  const id = limparCelula(valor)
    .replace(/\.mp4$/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  return MEDIA_ID_EXATO.test(id) ? id : "";
}

function extrairMediaIds(valor) {
  const texto = limparCelula(valor).toUpperCase();
  const encontrados = texto.match(MEDIA_ID_NO_TEXTO) || [];
  const ids = [];
  const vistos = new Set();

  encontrados.forEach((item) => {
    const id = normalizarMediaId(item);
    if (id && !vistos.has(id)) {
      vistos.add(id);
      ids.push(id);
    }
  });

  if (!ids.length) {
    const exato = normalizarMediaId(texto);
    if (exato) ids.push(exato);
  }

  return ids;
}

export function criarMapaDuracoes(linhas = []) {
  const mapa = {};

  (Array.isArray(linhas) ? linhas : []).forEach((linha) => {
    const id = normalizarMediaId(linha?.[0]);
    const duracao = limparCelula(linha?.[1]);
    if (!id || !duracao) return;
    mapa[id] = duracao;
  });

  return mapa;
}

function duracoesDoRegistro(idCampo, duracoesPorId) {
  const resultado = {};
  extrairMediaIds(idCampo).forEach((id) => {
    const duracao = limparCelula(duracoesPorId?.[id]);
    if (duracao) resultado[id] = duracao;
  });
  return resultado;
}

function linhaParaRegistro(linha = [], duracoesPorId = null) {
  const registro = {
    ID: limparCelula(linha[0]),
    DESCRICAO: limparCelula(linha[1]),
    DATA: limparCelula(linha[2]),
    LOCAL: limparCelula(linha[3]),
    REPORTER: limparCelula(linha[4]),
    AFILIADA_EMISSORA: limparCelula(linha[5]),
    PROGRAMA: limparCelula(linha[6]),
    EDITORIA: limparCelula(linha[7]),
    PGM: limparCelula(linha[8]),
  };

  if (duracoesPorId && typeof duracoesPorId === "object") {
    registro.DURACOES = duracoesDoRegistro(registro.ID, duracoesPorId);
  }

  return registro;
}

export function criarSnapshotCatalogo(linhas = [], opcoes = {}) {
  const duracoesPorId = opcoes.duracoesPorId && typeof opcoes.duracoesPorId === "object"
    ? opcoes.duracoesPorId
    : null;

  const registros = (Array.isArray(linhas) ? linhas : [])
    .map((linha) => linhaParaRegistro(linha, duracoesPorId))
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
