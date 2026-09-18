export const PROGRAMA_NAO_DEFINIDO = "PROGRAMA NAO DEFINIDO";

const PROGRAMA_POR_FAMILIA = new Map([
  ["1452", "AGROCULTURA"],
  ["2457", "JORNAL DA CULTURA"],
  ["1009", "JORNAL DA CULTURA"],
  ["2370", "JORNAL DA CULTURA"],
  ["2458", "JORNAL DA CULTURA"],
  ["2822", "JORNAL DA TARDE"],
  ["3293", "DE OLHO NO VOTO"],
  ["3184", "DE OLHO NO VOTO"],
  ["3027", "DE OLHO NO VOTO"],
  ["2712", "DE OLHO NA EDUCAÇÃO"],
  ["2922", "DOCUMENTÁRIOS"],
  ["0205", "REPÓRTER ECO"],
]);

export function normalizarMediaId(valor) {
  return String(valor ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toUpperCase();
}

export function familiaDoMediaId(valor) {
  const id = normalizarMediaId(valor);
  const match = id.match(/^(\d{4})[A-Z]/);
  return match ? match[1] : "";
}

export function prefixoDoMediaId(valor) {
  const id = normalizarMediaId(valor);
  const match = id.match(/^(\d{4}[A-Z])/);
  return match ? match[1] : "";
}

export function programaPorMediaId(valor) {
  const familia = familiaDoMediaId(valor);
  return PROGRAMA_POR_FAMILIA.get(familia) || PROGRAMA_NAO_DEFINIDO;
}

function programaExistenteValido(valor) {
  const programa = String(valor ?? "").trim();
  return programa && programa.toLocaleUpperCase("pt-BR") !== PROGRAMA_NAO_DEFINIDO
    ? programa
    : "";
}

export function programaPorListaDeIds(ids = [], programaAtual = "") {
  const programasConhecidos = [...new Set(
    ids
      .map(programaPorMediaId)
      .filter((programa) => programa && programa !== PROGRAMA_NAO_DEFINIDO)
  )];

  if (programasConhecidos.length === 1) return programasConhecidos[0];

  const existente = programaExistenteValido(programaAtual);
  if (existente) return existente;

  return PROGRAMA_NAO_DEFINIDO;
}

export function mapaProgramasPorFamilia() {
  return new Map(PROGRAMA_POR_FAMILIA);
}

// Mantido por compatibilidade com chamadas antigas. Agora o mapa representa famílias
// numéricas, pois a letra do Media ID (B/E/P/...) não deve alterar o programa.
export function mapaProgramasPorPrefixo() {
  return mapaProgramasPorFamilia();
}
