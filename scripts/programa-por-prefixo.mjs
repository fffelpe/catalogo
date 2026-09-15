export const PROGRAMA_NAO_DEFINIDO = "PROGRAMA NAO DEFINIDO";

const PROGRAMA_POR_PREFIXO = new Map([
  ["1452B", "AGROCULTURA"],
  ["1452E", "AGROCULTURA"],
  ["2457B", "JORNAL DA CULTURA"],
  ["2457E", "JORNAL DA CULTURA"],
  ["1009B", "JORNAL DA CULTURA"],
  ["1009E", "JORNAL DA CULTURA"],
  ["2370B", "JORNAL DA CULTURA"],
  ["2370E", "JORNAL DA CULTURA"],
  ["2458B", "JORNAL DA CULTURA"],
  ["2458E", "JORNAL DA CULTURA"],
  ["2822B", "JORNAL DA TARDE"],
  ["2822E", "JORNAL DA TARDE"],
  ["3293B", "DE OLHO NO VOTO"],
  ["3293E", "DE OLHO NO VOTO"],
  ["3184B", "DE OLHO NO VOTO"],
  ["3184E", "DE OLHO NO VOTO"],
  ["3027B", "DE OLHO NO VOTO"],
  ["3027E", "DE OLHO NO VOTO"],
  ["2712B", "DE OLHO NA EDUCAÇÃO"],
  ["2712E", "DE OLHO NA EDUCAÇÃO"],
  ["2922B", "DOCUMENTÁRIOS"],
  ["2922E", "DOCUMENTÁRIOS"],
  ["0205B", "REPÓRTER ECO"],
  ["0205E", "REPÓRTER ECO"],
]);

export function normalizarMediaId(valor) {
  return String(valor ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toUpperCase();
}

export function prefixoDoMediaId(valor) {
  const id = normalizarMediaId(valor);
  const match = id.match(/^(\d{4}[BE])/);
  return match ? match[1] : "";
}

export function programaPorMediaId(valor) {
  const prefixo = prefixoDoMediaId(valor);
  return PROGRAMA_POR_PREFIXO.get(prefixo) || PROGRAMA_NAO_DEFINIDO;
}

export function programaPorListaDeIds(ids = []) {
  const programas = [...new Set(
    ids
      .map(programaPorMediaId)
      .filter(Boolean)
  )];

  if (programas.length === 1) return programas[0];
  return PROGRAMA_NAO_DEFINIDO;
}

export function mapaProgramasPorPrefixo() {
  return new Map(PROGRAMA_POR_PREFIXO);
}
