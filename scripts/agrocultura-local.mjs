function texto(valor) {
  return String(valor ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function construirIndiceLocais(linhas = [], extrairIds) {
  if (typeof extrairIds !== "function") throw new TypeError("extrairIds deve ser uma função.");

  const locaisPorId = new Map();
  for (const linha of linhas) {
    const local = texto(linha?.[3]);
    if (!local) continue;

    for (const id of extrairIds(linha?.[0])) {
      if (!locaisPorId.has(id)) locaisPorId.set(id, local);
    }
  }

  return locaisPorId;
}

export function resolverLocal(listaIds = [], locaisPorId = new Map()) {
  for (const id of listaIds) {
    const local = texto(locaisPorId.get(id));
    if (local) return local;
  }
  return "";
}
