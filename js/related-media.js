// related-media.js
// Similaridade determinística para a ficha de Media ID.

const RelatedMedia = (() => {
  const STOPWORDS = new Set([
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no",
    "nas", "nos", "um", "uma", "para", "por", "com", "que"
  ]);

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(texto) {
    return new Set(normalizar(texto).split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t)));
  }

  function ids(registro) {
    if (typeof MediaIdUtils === "undefined") return [];
    return MediaIdUtils.extrair(registro?.ID);
  }

  function enrichment(registro) {
    if (typeof MediaEnrichment === "undefined" || typeof MediaEnrichment.obter !== "function") return {};
    const agregado = { subjects: [], keywords: [], places: [] };
    ids(registro).forEach((id) => {
      const item = MediaEnrichment.obter(id) || {};
      agregado.subjects.push(...(item.subjects || []));
      agregado.keywords.push(...(item.keywords || []));
      agregado.places.push(...(item.places || []));
    });
    return agregado;
  }

  function intersecaoPeso(a, b, peso) {
    const sa = new Set((a || []).map(normalizar).filter(Boolean));
    const sb = new Set((b || []).map(normalizar).filter(Boolean));
    let comuns = 0;
    sa.forEach((item) => { if (sb.has(item)) comuns++; });
    return comuns > 0 ? peso + Math.min(comuns - 1, 3) * (peso * 0.2) : 0;
  }

  function descricaoPeso(a, b) {
    const ta = tokens(a);
    const tb = tokens(b);
    if (!ta.size || !tb.size) return 0;
    let comuns = 0;
    ta.forEach((item) => { if (tb.has(item)) comuns++; });
    return comuns ? Math.min(25, comuns * 8) : 0;
  }

  function parseData(valor) {
    const m = String(valor || "").match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (!m) return null;
    let ano = Number(m[3]);
    if (m[3].length === 2) ano += ano < 50 ? 2000 : 1900;
    const data = new Date(ano, Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function score(itemA, itemB) {
    const a = enrichment(itemA);
    const b = enrichment(itemB);
    let total = 0;
    total += intersecaoPeso(a.subjects, b.subjects, 35);
    total += intersecaoPeso(a.keywords, b.keywords, 30);
    total += descricaoPeso(itemA.DESCRICAO, itemB.DESCRICAO);
    total += intersecaoPeso([itemA.LOCAL, ...(a.places || [])], [itemB.LOCAL, ...(b.places || [])], 18);
    if (normalizar(itemA.EDITORIA) && normalizar(itemA.EDITORIA) === normalizar(itemB.EDITORIA)) total += 12;
    if (normalizar(itemA.REPORTER) && normalizar(itemA.REPORTER) === normalizar(itemB.REPORTER)) total += 10;
    if (normalizar(itemA.PROGRAMA) && normalizar(itemA.PROGRAMA) === normalizar(itemB.PROGRAMA)) total += 6;

    const da = parseData(itemA.DATA);
    const db = parseData(itemB.DATA);
    if (da && db) {
      const dias = Math.abs(da - db) / 86400000;
      total += Math.max(0, 5 - Math.min(5, dias / 7));
    }
    return total;
  }

  function calcular(alvo, registros, opcoes = {}) {
    const limite = Number.isFinite(Number(opcoes.limite)) ? Number(opcoes.limite) : 6;
    const scoreMinimo = Number.isFinite(Number(opcoes.scoreMinimo)) ? Number(opcoes.scoreMinimo) : 8;
    const alvoIds = new Set(ids(alvo));
    const vistos = new Set();

    return (Array.isArray(registros) ? registros : [])
      .filter((registro) => {
        const registroIds = ids(registro);
        if (registroIds.some((id) => alvoIds.has(id))) return false;
        const chave = registroIds.slice().sort().join("|") || String(registro.ID || "");
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      })
      .map((registro, indice) => ({ registro, indice, score: score(alvo, registro) }))
      .filter((item) => item.score >= scoreMinimo)
      .sort((a, b) => b.score - a.score || a.indice - b.indice)
      .slice(0, limite)
      .map((item) => ({ ...item.registro, _RELATED_SCORE: item.score }));
  }

  return { calcular, score };
})();
