// keyword-results.js
// Ativa o modo de relacionamento exato quando a página recebe ?keyword=.

const KeywordResultsMode = (() => {
  const params = new URLSearchParams(window.location.search);
  const keyword = String(params.get("keyword") || "").trim();

  if (!keyword || typeof SearchEngine === "undefined" || typeof KeywordNavigation === "undefined") {
    return { ativo: false, keyword: "" };
  }

  const pesquisarOriginal = SearchEngine.pesquisar.bind(SearchEngine);

  SearchEngine.pesquisar = (registros, consulta, opcoes = {}) => {
    const termo = String(consulta || "").trim();
    if (termo) return pesquisarOriginal(registros, consulta, opcoes);

    const relacionados = KeywordNavigation.filtrarPorKeyword(
      registros,
      keyword,
      (id) => (typeof MediaEnrichment !== "undefined" ? MediaEnrichment.obter(id) : null)
    );

    return pesquisarOriginal(relacionados, "", opcoes);
  };

  async function atualizarContextoVisual() {
    const titulo = document.getElementById("tituloResultados");
    const input = document.getElementById("searchInput");

    if (titulo) titulo.textContent = `Palavra-chave: ${keyword}`;
    if (input) input.placeholder = "Buscar no acervo ou refinar por outro termo...";
    document.title = `${keyword} - Palavra-chave - Catálogo de Mídias`;

    try {
      await DadosMedia.carregarCSV();
      await MediaEnrichment.carregar();
      const total = KeywordNavigation.filtrarPorKeyword(
        DadosMedia.registros,
        keyword,
        (id) => MediaEnrichment.obter(id)
      ).length;

      window.setTimeout(() => {
        const status = document.getElementById("statusBusca");
        if (status && !String(input?.value || "").trim()) {
          status.textContent = total === 1
            ? `1 material relacionado à palavra-chave “${keyword}”.`
            : `${total} materiais relacionados à palavra-chave “${keyword}”.`;
        }
      }, 0);
    } catch (erro) {
      console.warn("Não foi possível atualizar o contexto da palavra-chave:", erro);
    }
  }

  document.addEventListener("DOMContentLoaded", atualizarContextoVisual);

  return { ativo: true, keyword };
})();
