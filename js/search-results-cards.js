// search-results-cards.js
// Organiza visualmente os resultados gerais em cards compactos, preservando
// busca, filtros, créditos, cópia de IDs e links já existentes.

(function () {
  const BODY_ID = "resultsBody";

  const MAPA_CLASSES = {
    "Descrição": "resultado-descricao",
    "Data": "resultado-meta-oculto-card",
    "Local": "resultado-local",
    "Repórter": "resultado-reporter",
    "Afiliada / Emissora": "resultado-afiliada",
    "Programa": "resultado-programa-badge",
    "Editoria": "resultado-meta-oculto-card"
  };

  function textoVisivel(elemento) {
    return String(elemento?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function marcarCelulas(tr) {
    tr.querySelectorAll("td[data-label]").forEach((td) => {
      const rotulo = td.getAttribute("data-label") || "";
      const classe = MAPA_CLASSES[rotulo];
      if (classe) td.classList.add(classe);

      if (classe && !textoVisivel(td)) {
        td.classList.add("resultado-meta-vazio");
      }
    });

    const celulaId = tr.querySelector("td.id-cell") || tr.querySelector("td:first-child");
    if (celulaId) celulaId.classList.add("resultado-id");
  }

  function criarAcaoDetalhes(tr) {
    if (tr.querySelector(".resultado-acoes")) return;

    const linkId = tr.querySelector(".id-media-link[href]");
    if (!linkId) return;

    const celula = document.createElement("td");
    celula.className = "resultado-acoes";
    celula.setAttribute("data-label", "Ações");

    const link = document.createElement("a");
    link.className = "resultado-detalhes";
    link.href = linkId.getAttribute("href") || "#";
    link.setAttribute("aria-label", `Ver mais detalhes de ${textoVisivel(linkId)}`);
    link.append(document.createTextNode("Mais detalhes"));

    const seta = document.createElement("span");
    seta.className = "resultado-detalhes-seta";
    seta.setAttribute("aria-hidden", "true");
    seta.textContent = "›";

    link.appendChild(seta);
    celula.appendChild(link);
    tr.appendChild(celula);
  }

  function decorarLinha(tr) {
    if (!tr || tr.nodeType !== Node.ELEMENT_NODE) return;
    if (tr.dataset.resultadoCardProcessado === "1") return;

    const celulas = tr.querySelectorAll("td");
    if (!celulas.length) return;

    if (celulas.length === 1 && celulas[0].hasAttribute("colspan")) {
      tr.classList.add("resultado-card-vazio");
      tr.dataset.resultadoCardProcessado = "1";
      return;
    }

    marcarCelulas(tr);
    criarAcaoDetalhes(tr);

    const primeiroId = tr.querySelector(".id-media-link");
    if (primeiroId) {
      tr.setAttribute("aria-label", `Resultado ${textoVisivel(primeiroId)}`);
    }

    tr.dataset.resultadoCardProcessado = "1";
  }

  function decorarTabela(tbody) {
    tbody?.querySelectorAll("tr").forEach(decorarLinha);
  }

  function inicializarCards() {
    const tbody = document.getElementById(BODY_ID);
    if (!tbody) return;

    decorarTabela(tbody);

    const observer = new MutationObserver((mutacoes) => {
      mutacoes.forEach((mutacao) => {
        mutacao.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches?.("tr")) decorarLinha(node);
          node.querySelectorAll?.("tr").forEach(decorarLinha);
        });
      });
    });

    observer.observe(tbody, { childList: true, subtree: false });
  }

  document.addEventListener("DOMContentLoaded", inicializarCards);
})();
