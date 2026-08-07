// catalogo-ui.js — Gerencia a renderização no DOM
// Funciona tanto em pages/resultado-busca.html (busca por ?q=) quanto em
// pages/programa.html (filtro por ?programa=, com refino opcional por ?q=)

let resultadosAtuais = [];
let paginaAtual = 0;
const ITENS_POR_PAGINA = 50;

const CAMPOS_DETALHE = [
  { chave: "DATA", rotulo: "Data" },
  { chave: "LOCAL", rotulo: "Local" },
  { chave: "REPÓRTER", rotulo: "Repórter" },
  { chave: "AFILIADA", rotulo: "Afiliada" },
  { chave: "EMISSORA", rotulo: "Emissora" },
  { chave: "PROGRAMA", rotulo: "Programa" },
  { chave: "EDITORIA", rotulo: "Editoria" },
];

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

function escapeHTML(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

async function inicializarBusca() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("q") || "";
  const programa = urlParams.get("programa") || "";

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = query;

  // Título/estado da página, quando existirem os elementos
  const titulo = document.getElementById("pageTitle");
  const status = document.getElementById("pageStatus");
  if (titulo && programa) {
    titulo.textContent = programa;
  }

  const container = document.getElementById("resultsContainer");
  if (container) container.innerHTML = "<p>Carregando acervo da planilha…</p>";

  try {
    await DadosMedia.carregarCSV();
  } catch (err) {
    if (container) {
      container.innerHTML =
        "<p>Não foi possível carregar a planilha. Verifique se ela ainda está publicada em Arquivo &gt; Compartilhar &gt; Publicar na Web.</p>";
    }
    if (status) status.textContent = "Erro ao carregar dados.";
    return;
  }

  executarBusca(query, programa);

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        const novoPrograma = new URLSearchParams(window.location.search).get(
          "programa"
        );
        executarBusca(e.target.value, novoPrograma || "");
      })
    );
  }

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", renderizarProximaPagina);
  }
}

function executarBusca(termo, programa) {
  resultadosAtuais = DadosMedia.buscarComPrograma(termo, programa);
  paginaAtual = 0;

  const container = document.getElementById("resultsContainer");
  if (container) container.innerHTML = "";

  const status = document.getElementById("pageStatus");
  if (status) {
    const quantidade = resultadosAtuais.length;
    status.textContent =
      quantidade === 1
        ? "1 resultado encontrado"
        : `${quantidade} resultados encontrados`;
  }

  renderizarProximaPagina();
}

function renderizarItem(item) {
  const li = document.createElement("li");
  li.className = "item-midia";
  li.id = `item-${item.ID}`;

  const camposHtml = CAMPOS_DETALHE.map(
    ({ chave, rotulo }) => `
      <div class="item-campo">
        <span class="item-campo-rotulo">${rotulo}</span>
        <span class="item-campo-valor">${escapeHTML(item[chave]) || "—"}</span>
      </div>`
  ).join("");

  li.innerHTML = `
    <div class="item-cabecalho">
      <span class="item-id">${escapeHTML(item.ID)}</span>
      <span class="item-assunto">${escapeHTML(item["DESCRIÇÃO"]) || "Sem descrição"}</span>
      <div class="item-acoes">
        <button type="button" class="btn-copiar-id" data-id="${escapeHTML(item.ID)}">
          Copiar ID
        </button>
      </div>
    </div>
    <div class="item-corpo">${camposHtml}</div>
  `;

  const btnCopiar = li.querySelector(".btn-copiar-id");
  btnCopiar.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(item.ID);
      btnCopiar.textContent = "Copiado!";
      btnCopiar.classList.add("copiado");
      setTimeout(() => {
        btnCopiar.textContent = "Copiar ID";
        btnCopiar.classList.remove("copiado");
      }, 1500);
    } catch (err) {
      console.error("Não foi possível copiar o ID:", err);
    }
  });

  return li;
}

function renderizarProximaPagina() {
  const container = document.getElementById("resultsContainer");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (!container) return;

  const inicio = paginaAtual * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;
  const itensParaRenderizar = resultadosAtuais.slice(inicio, fim);

  if (itensParaRenderizar.length === 0 && paginaAtual === 0) {
    container.innerHTML = "<p>Nenhum resultado encontrado no acervo.</p>";
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  const fragmento = document.createDocumentFragment();
  itensParaRenderizar.forEach((item) => fragmento.appendChild(renderizarItem(item)));
  container.appendChild(fragmento);

  paginaAtual++;

  if (loadMoreBtn) {
    loadMoreBtn.style.display = fim < resultadosAtuais.length ? "block" : "none";
  }
}

document.addEventListener("DOMContentLoaded", inicializarBusca);