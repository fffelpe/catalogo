// creditos-ui.js - Exibe créditos no resultado da busca sem alterar o motor de pesquisa.

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
    return String(valor || "")
      .split(/[\r\n,;]+/)
      .map((id) => id.trim())
      .filter(Boolean);
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
    texto.textContent = valor;

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

  function decorarLinha(tr) {
    if (!tr || tr.dataset.creditosProcessados === "1") return;
    tr.dataset.creditosProcessados = "1";

    const botaoCopiar = tr.querySelector(".btn-copiar-id");
    const celulaDescricao = tr.querySelector('td[data-label="Descrição"]');
    if (!botaoCopiar || !celulaDescricao) return;

    const ids = separarIds(botaoCopiar.dataset.ids);
    const encontrados = CreditosMedia.obterVarios(ids);
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
    encontrados.forEach((item) => conteudo.appendChild(criarBlocoCredito(item)));

    detalhes.append(resumo, conteudo);
    celulaDescricao.appendChild(detalhes);
  }

  async function inicializarCreditos() {
    const tbody = document.getElementById("resultsBody");
    if (!tbody || typeof CreditosMedia === "undefined") return;

    try {
      await CreditosMedia.carregar();
    } catch (erro) {
      console.warn("Créditos indisponíveis:", erro);
      return;
    }

    tbody.querySelectorAll("tr").forEach(decorarLinha);

    const observer = new MutationObserver((mutacoes) => {
      mutacoes.forEach((mutacao) => {
        mutacao.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches?.("tr")) decorarLinha(node);
          node.querySelectorAll?.("tr").forEach(decorarLinha);
        });
      });
    });

    observer.observe(tbody, { childList: true });
  }

  document.addEventListener("DOMContentLoaded", inicializarCreditos);
})();
