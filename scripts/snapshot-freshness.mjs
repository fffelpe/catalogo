const MS_POR_MINUTO = 60_000;

function parseData(valor) {
  const timestamp = Date.parse(String(valor || ""));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function avaliarFrescorSnapshot(snapshot, opcoes = {}) {
  const limiteMinutos = Number(opcoes.limiteMinutos ?? 20);
  const agoraMs = parseData(opcoes.agora || new Date().toISOString());
  const geradoEmMs = parseData(snapshot?.generatedAt);

  if (!Number.isFinite(limiteMinutos) || limiteMinutos <= 0) {
    return { ok: false, motivo: "Limite de frescor inválido." };
  }

  if (agoraMs === null) {
    return { ok: false, motivo: "Data de referência inválida." };
  }

  if (geradoEmMs === null) {
    return { ok: false, motivo: "generatedAt ausente ou inválido no snapshot." };
  }

  const idadeMs = Math.max(0, agoraMs - geradoEmMs);
  const idadeMinutos = Math.floor(idadeMs / MS_POR_MINUTO);
  const ultimaSincronizacao = new Date(geradoEmMs).toISOString();

  if (idadeMs > limiteMinutos * MS_POR_MINUTO) {
    return {
      ok: false,
      idadeMinutos,
      limiteMinutos,
      ultimaSincronizacao,
      motivo: `Snapshot excedeu o limite de ${limiteMinutos} minutos.`,
    };
  }

  return {
    ok: true,
    idadeMinutos,
    limiteMinutos,
    ultimaSincronizacao,
  };
}
