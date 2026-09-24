// media-enrichment.js - Metadados enriquecidos opcionais por Media ID.

const MediaEnrichment = (() => {
  let itens = Object.create(null);
  let carregado = false;
  let carregamentoPromise = null;

  const ENRICHMENT_URL = (() => {
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

  function normalizarMediaId(valor) {
    if (typeof MediaIdUtils !== "undefined" && typeof MediaIdUtils.normalizar === "function") {
      return MediaIdUtils.normalizar(valor);
    }

    const limpo = String(valor || "")
      .replace(/\.mp4$/i, "")
      .replace(/[\u00A0\u200B-\u200D\uFEFF\s]+/g, "")
      .trim()
      .toUpperCase();

    return /^\d{4}[A-Z]\d{5,6}$/.test(limpo) ? limpo : "";
  }

  function normalizarLista(valor) {
    const lista = Array.isArray(valor) ? valor : [];
    const vistos = new Set();
    return lista
      .map((item) => String(item ?? "").trim())
      .filter((item) => {
        if (!item) return false;
        const chave = item.toLocaleLowerCase("pt-BR");
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      });
  }

  function normalizarSegmento(segmento = {}) {
    const start = Number(segmento.start);
    const endAusente = segmento.end === undefined || segmento.end === null || segmento.end === "";
    const end = endAusente ? null : Number(segmento.end);
    const text = String(segmento.text ?? "").trim();

    if (!Number.isFinite(start) || start < 0 || !text) return null;
    if (end !== null && (!Number.isFinite(end) || end < start)) return null;

    return {
      start,
      ...(end === null ? {} : { end }),
      text
    };
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

  function normalizarPayload(payload) {
    if (!payload || payload.schemaVersion !== 1 || !payload.items || typeof payload.items !== "object") {
      throw new Error("Formato de media-enrichment.json não reconhecido.");
    }

    const normalizados = Object.create(null);
    Object.entries(payload.items).forEach(([mediaId, item]) => {
      const id = normalizarMediaId(mediaId);
      if (!id) return;
      normalizados[id] = normalizarItem(item);
    });
    return normalizados;
  }

  async function carregar() {
    if (carregado) return itens;
    if (carregamentoPromise) return carregamentoPromise;

    carregamentoPromise = (async () => {
      if (typeof fetch !== "function") {
        throw new Error("Fetch indisponível para carregar enrichment.");
      }

      const resposta = await fetch(ENRICHMENT_URL, { cache: "no-cache" });
      if (!resposta.ok) {
        throw new Error(`Enrichment respondeu HTTP ${resposta.status}.`);
      }

      const payload = await resposta.json();
      itens = normalizarPayload(payload);
      carregado = true;
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
    const item = obter(mediaId);
    return item ? item.segments : [];
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
    return { ...itens };
  }

  return {
    carregar,
    obter,
    obterSegmentos,
    camposPesquisa,
    todos,
    normalizarItem
  };
})();
