// catalogo-ui.js - Gerencia a renderização da tabela de resultados no DOM
// Funciona tanto em pages/resultado-busca.html quanto em pages/programa.html

let resultadosAtuais = [];
let paginaAtual = 0;
const ITENS_POR_PAGINA = 50;
const CHAVE_HISTORICO_BUSCA = "catalogoMidiasHistoricoBusca";
const LIMITE_HISTORICO_BUSCA = 8;

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

function renderizarCelulaId(valor, rotulo = "ID") {
  const valorSeguro = escapeHtml(String(valor || ""));

  return `
    <td data-label="${escapeHtml(rotulo)}" class="id-cell">
      <span class="id-cell-content">
        <span class="id-text">${formatarIds(valor)}</span>
        <button type="button" class="btn-copiar-id" data-ids="${valorSeguro}" title="Copiar ID" aria-label="Copiar ID">
          <img src="../images/copiar.png?v=2" alt="" class="icone-copiar" aria-hidden="true">
        </button>
      </span>
    </td>
  `;
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
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(ids);
    else copiarTextoAlternativo(ids);

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

function obterHistoricoBusca() {
  try {
    const historico = JSON.parse(localStorage.getItem(CHAVE_HISTORICO_BUSCA) || "[]");
    return Array.isArray(historico) ? historico : [];
  } catch (err) {
    console.warn("Não foi possível ler o histórico de busca:", err);
    return [];
  }
}

function salvarTermoNoHistorico(termo) {
  const termoLimpo = String(termo || "").trim();
  if (termoLimpo.length < 2) return;

  const historico = obterHistoricoBusca().filter(
    (item) => item.toLocaleLowerCase("pt-BR") !== termoLimpo.toLocaleLowerCase("pt-BR")
  );
  historico.unshift(termoLimpo);

  try {
    localStorage.setItem(CHAVE_HISTORICO_BUSCA, JSON.stringify(historico.slice(0, LIMITE_HISTORICO_BUSCA)));
  } catch (err) {
    console.warn("Não foi possível salvar o histórico de busca:", err);
  }

  renderizarHistoricoBusca();
}

function limparHistoricoBusca() {
  try {
    localStorage.removeItem(CHAVE_HISTORICO_BUSCA);
  } catch (err) {
    console.warn("Não foi possível limpar o histórico de busca:", err);
  }
  renderizarHistoricoBusca();
}

function renderizarHistoricoBusca() {
  const container = document.getElementById("historicoBusca");
  const lista = document.getElementById("listaHistoricoBusca");
  if (!container || !lista) return;

  const historico = obterHistoricoBusca();
  lista.innerHTML = "";
  container.hidden = historico.length === 0;

  historico.forEach((termo) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "historico-item";
    botao.dataset.termo = termo;
    botao.textContent = termo;
    botao.title = `Pesquisar novamente por ${termo}`;
    lista.appendChild(botao);
  });
}

function aplicarTermoDoHistorico(termo, programa) {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.value = termo;
    searchInput.focus();
  }
  executarBusca(termo, programa, false);
}

async function inicializarBusca() {
  const params = new URLSearchParams(window.location.search);
  const termoInicial = params.get("q") || "";
  const programa = params.get("programa") || "";
  const searchInput = document.getElementById("searchInput");
  const tituloPrograma = document.getElementById("tituloPrograma");

  if (searchInput) searchInput.value = termoInicial;
  if (tituloPrograma) tituloPrograma.textContent = programa ? decodeURIComponent(programa) : "Todos os Programas";

  renderizarHistoricoBusca();
  setStatus("Carregando acervo...");

  try {
    await DadosMedia.carregarCSV();
  } catch (err) {
    setStatus("Não foi possível carregar o acervo. Verifique sua conexão e tente novamente.");
    return;
  }

  executarBusca(termoInicial, programa, Boolean(termoInicial));

  if (typeof inicializarVtsAgricultura === "function") inicializarVtsAgricultura(programa);

  if (searchInput) {
    searchInput.addEventListener("input", debounce((e) => executarBusca(e.target.value, programa, false)));
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executarBusca(e.target.value, programa, true);
      }
    });
    searchInput.addEventListener("change", (e) => {
      if (e.target.value.trim()) salvarTermoNoHistorico(e.target.value);
    });
  }

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", renderizarProximaPagina);

  const limparHistoricoBtn = document.getElementById("limparHistoricoBtn");
  if (limparHistoricoBtn) limparHistoricoBtn.addEventListener("click", limparHistoricoBusca);

  document.addEventListener("click", (event) => {
    const botaoCopiar = event.target.closest(".btn-copiar-id");
    if (botaoCopiar) {
      copiarIds(botaoCopiar.dataset.ids, botaoCopiar);
      return;
    }

    const itemHistorico = event.target.closest(".historico-item");
    if (itemHistorico) aplicarTermoDoHistorico(itemHistorico.dataset.termo, programa);
  });
}

function executarBusca(termo, programa, registrarHistorico = false) {
  resultadosAtuais = programa ? DadosMedia.buscarPorPrograma(programa, termo) : DadosMedia.buscar(termo);
  paginaAtual = 0;

  const tbody = document.getElementById("resultsBody");
  if (tbody) tbody.innerHTML = "";

  setStatus(`${resultadosAtuais.length} resultado(s) encontrado(s).`);
  if (registrarHistorico) salvarTermoNoHistorico(termo);
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

  const frag = document.createDocumentFragment();
  itensParaRenderizar.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      ${renderizarCelulaId(item.ID)}
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

  if (loadMoreBtn) loadMoreBtn.style.display = fim < resultadosAtuais.length ? "inline-block" : "none";
}

document.addEventListener("DOMContentLoaded", inicializarBusca);
