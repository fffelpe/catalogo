// creditos-ui.js - Exibe créditos na busca geral e nas tabelas específicas.
// Qualquer programa pode receber créditos quando houver documento associado ao mesmo Media ID.

(function () {
  const ROTULOS_CREDITOS = {
    credito: "Crédito",
    roteiroProducao: "Roteiro e produção",
    producao: "Produção",
    reportagem: "Reportagem",
    imagens: "Imagens",
    camera: "Câmera",
    drone: "Drone",
    edicao: "Edição",
    arte: "Arte",
    finalizacao: "Finalização"
  };

  function separarIds(valor) {
    if (typeof MediaIdUtils !== "undefined") return MediaIdUtils.extrair(valor);
    return String(valor || "")
      .split(/[\r\n,;+\/|&]+/)
      .map((id) => id.trim())
      .filter(Boolean);
  }

  function idsDaLinha(tr) {
    const ids = [];

    tr.querySelectorAll(".btn-copiar-id").forEach((botao) => {
      separarIds(botao.dataset.ids).forEach((id) => ids.push(id));
    });

    return [...new Set(ids)];
  }

  function criarCampo(rotulo, valor) {
    if (!valor) return null;

    const grupo = document.createElement("div");
    grupo.className = "credito-campo";

    const titulo = document.createElement("strong");
    titulo.className = "credito-rotulo";
    titulo.textContent = rotulo;

    const texto = document.createElement("span");
    texto.className = "credito-valor";
    texto.textContent = Array.isArray(valor) ? valor.join(", ") : valor;

    grupo.append(titulo, texto);
    return grupo;
  }

  function criarBlocoCredito(item) {
    const bloco = document.createElement("div");
    bloco.className = "credito-bloco";

    const cabecalho = document.createElement("div");
    cabecalho.className = "credito-cabecalho";

    const id = document.createElement("span");
    id.className = "credito-media-id";
    id.textContent = item.id;
    cabecalho.appendChild(id);

    if (item.dados.materia) {
      const materia = document.createElement("strong");
      materia.className = "credito-materia";
      materia.textContent = item.dados.materia;
      cabecalho.appendChild(materia);
    }

    bloco.appendChild(cabecalho);

    const fontes = Array.isArray(item.dados.fontes) ? item.dados.fontes : [];

    fontes.forEach((fonte) => {
      const fonteGrupo = document.createElement("div");
      fonteGrupo.className = "credito-fonte";

      const rotulo = document.createElement("strong");
      rotulo.className = "credito-rotulo";
      rotulo.textContent = "Fonte";
      fonteGrupo.appendChild(rotulo);

      const nome = document.createElement("span");
      nome.className = "credito-valor";
      nome.textContent = fonte.nome || "";
      fonteGrupo.appendChild(nome);

      if (fonte.cargo) {
        const cargo = document.createElement("small");
        cargo.className = "credito-cargo";
        cargo.textContent = fonte.cargo;
        fonteGrupo.appendChild(cargo);
      }

      bloco.appendChild(fonteGrupo);
    });

    const creditos = item.dados.creditos || {};

    Object.entries(creditos).forEach(([chave, valor]) => {
      const campo = criarCampo(ROTULOS_CREDITOS[chave] || chave, valor);
      if (campo) bloco.appendChild(campo);
    });

    return bloco;
  }

  function encontrarCelulaDescricao(tr) {
    return (
      tr.querySelector('td[data-label="Descrição"]') ||
      tr.querySelector('td[data-label="DESCRIÇÃO"]') ||
      tr.querySelector('td[data-label="Descricao"]') ||
      tr.querySelector('td[data-label="DESCRICAO"]')
    );
  }

  function decorarLinha(tr) {
    if (!tr || tr.dataset.creditosProcessados === "1") return;

    const celulaDescricao = encontrarCelulaDescricao(tr);
    const ids = idsDaLinha(tr);

    if (!ids.length || !celulaDescricao) return;

    const encontrados = CreditosMedia.obterVarios(ids);
    tr.dataset.creditosProcessados = "1";

    if (!encontrados.length) return;

    const detalhes = document.createElement("details");
    detalhes.className = "creditos-detalhes";

    const resumo = document.createElement("summary");
    resumo.className = "creditos-resumo";
    resumo.textContent = encontrados.length > 1
      ? `Ver créditos (${encontrados.length})`
      : "Ver créditos";

    const conteudo = document.createElement("div");
    conteudo.className = "creditos-conteudo";

    encontrados.forEach((item) => {
      conteudo.appendChild(criarBlocoCredito(item));
    });

    detalhes.append(resumo, conteudo);
    celulaDescricao.appendChild(detalhes);
  }

  function decorarTabela(tbody) {
    if (!tbody) return;
    tbody.querySelectorAll("tr").forEach(decorarLinha);
  }

  function observarTabela(tbody) {
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

    observer.observe(tbody, {
      childList: true,
      subtree: true
    });
  }

  async function inicializarCreditos() {
    if (typeof CreditosMedia === "undefined") return;

    try {
      await CreditosMedia.carregar();
    } catch (erro) {
      console.warn("Créditos indisponíveis:", erro);
      return;
    }

    observarTabela(document.getElementById("resultsBody"));
    observarTabela(document.getElementById("tbodyVtsAgro"));
    observarTabela(document.getElementById("mamAgroBody"));
  }

  document.addEventListener("DOMContentLoaded", inicializarCreditos);
})();