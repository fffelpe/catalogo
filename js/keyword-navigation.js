// keyword-navigation.js
// Liga palavras-chave da ficha a uma visão exata de materiais relacionados.

const KeywordNavigation = (() => {
  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR")
      .replace(/\s+/g, " ");
  }

  function criarUrl(keyword, pagina = "resultado-busca.html") {
    const termo = String(keyword || "").trim();
    if (!termo) return pagina;
    return `${pagina}?keyword=${encodeURIComponent(termo)}`;
  }

  function corresponde(keywords, procurada) {
    const alvo = normalizar(procurada);
    if (!alvo) return false;
    return (Array.isArray(keywords) ? keywords : [])
      .some((keyword) => normalizar(keyword) === alvo);
  }

  function idsDoRegistro(registro) {
    if (typeof MediaIdUtils !== "undefined" && typeof MediaIdUtils.extrair === "function") {
      return MediaIdUtils.extrair(registro?.ID);
    }
    return String(registro?.ID || "")
      .split(/[\r\n,;+\/|&]+/)
      .map((id) => id.trim())
      .filter(Boolean);
  }

  function filtrarPorKeyword(registros, keyword, obterEnriquecimento) {
    if (!String(keyword || "").trim()) return [];
    const obter = typeof obterEnriquecimento === "function"
      ? obterEnriquecimento
      : (id) => (typeof MediaEnrichment !== "undefined" ? MediaEnrichment.obter(id) : null);

    return (Array.isArray(registros) ? registros : []).filter((registro) =>
      idsDoRegistro(registro).some((id) => corresponde(obter(id)?.keywords, keyword))
    );
  }

  return {
    normalizar,
    criarUrl,
    corresponde,
    filtrarPorKeyword
  };
})();
