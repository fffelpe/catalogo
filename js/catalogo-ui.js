// catalogo-ui.js - Gerencia a renderização da tabela de resultados no DOM
// Funciona tanto em pages/resultado-busca.html quanto em pages/programa.html

let resultadosAtuais = [];
let paginaAtual = 0;
const ITENS_POR_PAGINA = 50;

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

function setStatus(msg) {
  const el = document.getElementById("statusBusca");
  if (el) el.textContent = msg;
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function separarIds(valor) {
  return String(valor || "")
    .split(/[\r\n,;]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function formatarIds(valor) {
  return separarIds(valor)
    .map((id) => escapeHtml(id))
    .join("<br>");
}

function copiarTextoAlternativo(texto) {
  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  const copiou = document.execCommand("copy");
  textarea.remove();

  if (!copiou) throw new Error("O navegador não permitiu copiar o texto.");
}

async function copiarIds(valor, botao) {
  const ids = separarIds(valor).join("\n");
  if (!ids) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(ids);
    } else {
      copiarTextoAlternativo(ids);
    }

    botao.classList.add("copiado");
    botao.title = "ID copiado";
    botao.setAttribute("aria-label", "ID copiado");

    window.setTimeout(() => {
      botao.classList.remove("copiado");
      botao.title = "Copiar ID";
      botao.setAttribute("aria-label", "Copiar ID");
    }, 1200);
  } catch (err) {
    console.error("Erro ao copiar ID:", err);
    botao.title = "Não foi possível copiar o ID";
  }
}

async function inicializarBusca() {
  const params = new URLSearchParams(window.location.search);
  const termoInicial = params.get("q") || "";
  const programa = params.get("programa") || "";

  const searchInput = document.getElementById("searchInput");
  const tituloPrograma = document.getElementById("tituloPrograma");

  if (searchInput) searchInput.value = termoInicial;
  if (tituloPrograma) {
    tituloPrograma.textContent = programa
      ? decodeURIComponent(programa)
      : "Todos os Programas";
  }

  setStatus("Carregando acervo...");

  try {
    await DadosMedia.carregarCSV();
  } catch (err) {
    setStatus("Não foi possível carregar o acervo. Verifique sua conexão e tente novamente.");
    return;
  }

  executarBusca(termoInicial, programa);

  // Abas "VT'S + ano" (só aparecem/funcionam na página do Agrocultura).
  // Independem do imgs.csv principal — carregam direto das planilhas por ano.
  if (typeof inicializarVtsAgricultura === "function") {
    inicializarVtsAgricultura(programa);
  }

  if (searchInput) {
    searchInput.addEventListener("input", debounce((e) => {
      executarBusca(e.target.value, programa);
    }));
  }

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", renderizarProximaPagina);
  }

  document.addEventListener("click", (event) => {
    const botao = event.target.closest(".btn-copiar-id");
    if (!botao) return;

    copiarIds(botao.dataset.ids, botao);
  });
}

function executarBusca(termo, programa) {
  resultadosAtuais = programa
    ? DadosMedia.buscarPorPrograma(programa, termo)
    : DadosMedia.buscar(termo);

  paginaAtual = 0;

  const tbody = document.getElementById("resultsBody");
  if (tbody) tbody.innerHTML = "";

  setStatus(`${resultadosAtuais.length} resultado(s) encontrado(s).`);

  renderizarProximaPagina();
}

function renderizarProximaPagina() {
  const tbody = document.getElementById("resultsBody");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (!tbody) return;

  const inicio = paginaAtual * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;
  const itensParaRenderizar = resultadosAtuais.slice(inicio, fim);

  if (itensParaRenderizar.length === 0 && paginaAtual === 0) {
    tbody.innerHTML = '<tr><td colspan="8">Nenhum resultado encontrado.</td></tr>';
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  // data-label em cada <td> permite empilhar a tabela em telas pequenas (ver main.css)
  const frag = document.createDocumentFragment();
  itensParaRenderizar.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="ID" class="id-cell">
        <span class="id-cell-content">
          <span class="id-text">${formatarIds(item.ID)}</span>
          <button
            type="button"
            class="btn-copiar-id"
            data-ids="${escapeHtml(item.ID)}"
            title="Copiar ID"
            aria-label="Copiar ID"
          >
            <img
              src="../images/copiar.png"
              alt=""
              class="icone-copiar"
              aria-hidden="true"
            >
          </button>
        </span>
      </td>
      <td data-label="Descrição">${escapeHtml(item.DESCRICAO)}</td>
      <td data-label="Data">${escapeHtml(item.DATA)}</td>
      <td data-label="Local">${escapeHtml(item.LOCAL)}</td>
      <td data-label="Repórter">${escapeHtml(item.REPORTER)}</td>
      <td data-label="Afiliada / Emissora">${escapeHtml(item.AFILIADA_EMISSORA)}</td>
      <td data-label="Programa">${escapeHtml(item.PROGRAMA)}</td>
      <td data-label="Editoria">${escapeHtml(item.EDITORIA)}</td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  paginaAtual++;

  if (loadMoreBtn) {
    loadMoreBtn.style.display = fim < resultadosAtuais.length ? "inline-block" : "none";
  }
}

document.addEventListener("DOMContentLoaded", inicializarBusca);
