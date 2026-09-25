export const MEDIA_ID_EXATO_RE = /^\d{4}[A-Z]\d{5,6}$/i;
const MEDIA_ID_GLOBAL_RE = /(?<![A-Z0-9])\d{4}[A-Z]\d{5,6}(?![A-Z0-9])/gi;

export function normalizarMediaId(valor) {
  const limpo = String(valor ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/[\u00A0\u200B-\u200D\uFEFF\s]+/g, "")
    .trim()
    .toUpperCase();
  return MEDIA_ID_EXATO_RE.test(limpo) ? limpo : "";
}

export function extrairMediaIds(valor) {
  const texto = String(valor ?? "").toUpperCase();
  const encontrados = texto.match(MEDIA_ID_GLOBAL_RE) || [];
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

export function formatarMediaIds(valor) {
  return extrairMediaIds(valor).join("\n");
}

export function validarConteudoMediaIds(valor) {
  const original = String(valor ?? "").toUpperCase();
  const ids = extrairMediaIds(original);
  if (!original.trim()) return { ids: [], valido: true, restante: "" };
  if (!ids.length) return { ids: [], valido: false, restante: original.trim() };

  const restante = original
    .replace(MEDIA_ID_GLOBAL_RE, "")
    .replace(/[\s,;+\/|&-]+/g, "");

  return { ids, valido: !restante, restante };
}
