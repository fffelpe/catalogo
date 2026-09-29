function limparCelula(valor) {
  return String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarStatus(valor, campo, id) {
  const original = limparCelula(valor);
  const normalizado = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR");

  if (normalizado === "SIM") return true;
  if (normalizado === "NAO") return false;
  throw new Error(`${campo} de ${id || "registro"} deve ser SIM ou NÃO.`);
}

function linhaVazia(linha) {
  return !Array.isArray(linha) || linha.every((valor) => !limparCelula(valor));
}

function criarAfiliadas(linhas = []) {
  const ids = new Set();

  return (Array.isArray(linhas) ? linhas : [])
    .filter((linha) => !linhaVazia(linha))
    .map((linha) => {
      const id = limparCelula(linha?.[0]).toUpperCase();
      const nome = limparCelula(linha?.[1]);
      const uf = limparCelula(linha?.[2]);
      const cidade = limparCelula(linha?.[3]);
      const ativaValor = limparCelula(linha?.[4]);

      if (!id) throw new Error("AFILIADA_ID vazio.");
      if (ids.has(id)) throw new Error(`AFILIADA_ID duplicado: ${id}.`);
      if (!nome) throw new Error(`Nome da afiliada vazio: ${id}.`);

      ids.add(id);
      return {
        id,
        nome,
        uf,
        cidade,
        ativa: normalizarStatus(ativaValor, "ATIVA", id),
      };
    });
}

function criarReporteres(linhas = [], afiliadasIds = new Set()) {
  const ids = new Set();

  return (Array.isArray(linhas) ? linhas : [])
    .filter((linha) => !linhaVazia(linha))
    .map((linha) => {
      const id = limparCelula(linha?.[0]).toUpperCase();
      const nome = limparCelula(linha?.[1]);
      const afiliadaId = limparCelula(linha?.[2]).toUpperCase();
      const funcao = limparCelula(linha?.[3]);
      const ativoValor = limparCelula(linha?.[4]);

      if (!id) throw new Error("REPORTER_ID vazio.");
      if (ids.has(id)) throw new Error(`REPORTER_ID duplicado: ${id}.`);
      if (!nome) throw new Error(`Nome do repórter vazio: ${id}.`);
      if (!afiliadaId || !afiliadasIds.has(afiliadaId)) {
        throw new Error(`Repórter ${id} aponta para afiliada inexistente: ${afiliadaId || "(vazia)"}.`);
      }

      ids.add(id);
      return {
        id,
        nome,
        afiliadaId,
        funcao,
        ativo: normalizarStatus(ativoValor, "ATIVO", id),
      };
    });
}

export function criarSnapshotAfiliadasReporteres(afiliadasRows = [], reporteresRows = [], opcoes = {}) {
  const afiliadas = criarAfiliadas(afiliadasRows);
  if (!afiliadas.length) {
    throw new Error("Snapshot de afiliadas/repórteres sem nenhuma afiliada válida.");
  }

  const afiliadasIds = new Set(afiliadas.map((item) => item.id));
  const reporteres = criarReporteres(reporteresRows, afiliadasIds);

  return {
    schemaVersion: 1,
    generatedAt: opcoes.generatedAt || new Date().toISOString(),
    afiliadas,
    reporteres,
  };
}
