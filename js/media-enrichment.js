// media-enrichment.js
// Camada opcional de metadados enriquecidos por Media ID.

const MediaEnrichment = (() => {
  let itens = {};
  let carregado = false;
  let carregamentoPromise = null;

  const SNAPSHOT_URL = (() => {
    const scriptSrc = typeof document !== "undefined" ? document.currentScript?.src : "";
    if (scriptSrc) return new URL("../data/media-enrichment.json", scriptSrc).href;
    if (typeof window !== "undefined" && window.location?.href) {
      const caminho = window.location.pathname.includes("/pages/")
        ? "../data/media-enrichment.json"
        : "data/media-enrichment.json";
      return new URL(caminho, window.location.href).href;
    }
    return "data/media-enrichment.json";
  })();

  function limparTexto(valor) {
    return String(valor ?? "")
      .replace(/\u00A0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizarLista(valor) {
    if (!Array.isArray(valor)) return [];
    const vistos = new Set();
    return valor
      .map(limparTexto)
      .filter((item) => {
        if (!item) return false;
        const chave = item.toLocaleLowerCase("pt-BR");
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      });
  }

  function normalizarSegmento(segmento) {
    if (!segmento || typeof segmento !== "object") return null;
    const start = Number(segmento.start);
    const end = segmento.end === "" || segmento.end == null ? null : Number(segmento.end);
    const text = limparTexto(segmento.text);

    if (!Number.isFinite(start) || start < 0 || !text) return null;
    if (end != null && (!Number.isFinite(end) || end < start)) return null;

    const saida = { start, text };
    if (end != null) saida.end = end;
    return saida;
  }

  function normalizarItem(item = {}) {
    return {
      keywords: normalizarLista(item.keywords),
      subjects: normalizarLista(item.subjects),
      people: normalizarLista(item.people),
      places: normalizarLista(item.places),
      segments: (Array.isArray(item.segments) ? item.segments : [])
        .map(normalizarSegmento)
        .filter(Boolean)
    };
  }

  function normalizarMediaId(valor) {
    if (typeof MediaIdUtils !== "undefined" && typeof MediaIdUtils.normalizar === "function") {
      return MediaIdUtils.normalizar(valor);
    }
    const limpo = String(valor ?? "").replace(/\.mp4$/i, "").replace(/\s+/g, "").toUpperCase();
    return /^\d{4}[A-Z]\d{5,6}$/.test(limpo) ? limpo : "";
  }

  function normalizarPayload(payload) {
    const saida = {};
    if (!payload || payload.schemaVersion !== 1 || !payload.items || typeof payload.items !== "object") {
      return { schemaVersion: 1, items: saida };
    }

    Object.entries(payload.items).forEach(([chave, item]) => {
      const id = normalizarMediaId(chave);
      if (!id) return;
      saida[id] = normalizarItem(item);
    });

    return { schemaVersion: 1, items: saida };
  }

  async function carregar() {
    if (carregado) return itens;
    if (carregamentoPromise) return carregamentoPromise;

    carregamentoPromise = (async () => {
      try {
        if (typeof fetch !== "function") return itens;
        const resposta = await fetch(SNAPSHOT_URL, { cache: "no-cache" });
        if (!resposta.ok) return itens;
        const payload = normalizarPayload(await resposta.json());
        itens = payload.items;
      } catch (erro) {
        console.warn("Enriquecimento de mídia indisponível nesta execução:", erro);
      } finally {
        carregado = true;
      }
      return itens;
    })();

    try {
      return await carregamentoPromise;
    } finally {
      carregamentoPromise = null;
    }
  }

  function obter(mediaId) {
    const id = normalizarMediaId(mediaId);
    return id && itens[id] ? itens[id] : null;
  }

  function obterSegmentos(mediaId) {
    return obter(mediaId)?.segments || [];
  }

  function camposPesquisa(mediaId) {
    const item = obter(mediaId) || normalizarItem();
    return {
      KEYWORDS: item.keywords.join(" "),
      SUBJECTS: item.subjects.join(" "),
      PEOPLE: item.people.join(" "),
      PLACES: item.places.join(" "),
      SEGMENTS: item.segments.map((segmento) => segmento.text).join(" ")
    };
  }

  function todos() {
    return itens;
  }

  function _definirParaTeste(novosItens = {}) {
    itens = normalizarPayload({ schemaVersion: 1, items: novosItens }).items;
    carregado = true;
    return itens;
  }

  return {
    SNAPSHOT_URL,
    carregar,
    obter,
    obterSegmentos,
    camposPesquisa,
    todos,
    normalizarItem,
    _normalizarPayload: normalizarPayload,
    _definirParaTeste
  };
})();
