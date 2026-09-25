// media-segments.js
// Pesquisa em trechos indexados e navegação por timecode.

const MediaSegments = (() => {
  const STOPWORDS = new Set([
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no",
    "nas", "nos", "um", "uma", "uns", "umas", "para", "por", "com", "sem", "que"
  ]);

  function normalizar(texto) {
    if (typeof SearchEngine !== "undefined" && typeof SearchEngine.normalizar === "function") {
      return SearchEngine.normalizar(texto);
    }
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenizar(consulta) {
    return normalizar(consulta)
      .split(" ")
      .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
  }

  function scoreSegmento(segmento, consulta) {
    const texto = normalizar(segmento?.text);
    const frase = normalizar(consulta);
    if (!texto || !frase) return 0;

    const tokens = tokenizar(consulta);
    if (!tokens.length) return 0;

    const encontrados = tokens.filter((token) => texto.includes(token));
    if (!encontrados.length) return 0;

    let score = encontrados.length * 10;
    if (texto.includes(frase)) score += 30;
    if (encontrados.length === tokens.length) score += 20;
    return score;
  }

  function _buscarNosSegmentos(segmentos, consulta) {
    return (Array.isArray(segmentos) ? segmentos : [])
      .map((segmento, indice) => ({
        ...segmento,
        score: scoreSegmento(segmento, consulta),
        _indice: indice
      }))
      .filter((segmento) => segmento.score > 0)
      .sort((a, b) => b.score - a.score || a._indice - b._indice)
      .map(({ _indice, ...segmento }) => segmento);
  }

  function buscar(mediaId, consulta) {
    if (typeof MediaEnrichment === "undefined" || typeof MediaEnrichment.obterSegmentos !== "function") {
      return [];
    }
    return _buscarNosSegmentos(MediaEnrichment.obterSegmentos(mediaId), consulta);
  }

  function buscarEmTodos(registros, consulta) {
    const resultados = [];
    (Array.isArray(registros) ? registros : []).forEach((registro) => {
      const ids = typeof MediaIdUtils !== "undefined" ? MediaIdUtils.extrair(registro.ID) : [];
      ids.forEach((id) => {
        const matches = buscar(id, consulta);
        if (matches.length) resultados.push({ registro, mediaId: id, matches });
      });
    });
    return resultados;
  }

  function formatarTimecode(segundos) {
    const total = Math.max(0, Math.floor(Number(segundos) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function criarUrlFicha(mediaId, start) {
    if (typeof MediaIdUtils === "undefined") return "";
    const id = MediaIdUtils.normalizar(mediaId);
    if (!id) return "";
    const t = Number(start);
    const sufixo = Number.isFinite(t) && t > 0 ? `&t=${Math.floor(t)}` : "";
    return `media.html?id=${encodeURIComponent(id)}${sufixo}`;
  }

  return {
    buscar,
    buscarEmTodos,
    formatarTimecode,
    criarUrlFicha,
    _buscarNosSegmentos
  };
})();
