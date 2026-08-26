// catalogo-ui.js - Integra a interface com busca inteligente, autocomplete,
// histórico, buscas populares, paginação e cópia de Media IDs.

let resultadosAtuais = [];
let paginaAtual = 0;
const ITENS_POR_PAGINA = 50;

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), timeout);
  };
}

function setStatus(msg) {
  const el = document.getElementById("statusBusca");
  if (el) el.textContent = msg;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
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
  return separarIds(valor).map((id) => escapeHtml(id)).join("<br>");
}

function renderizarCelulaId(valor, rotulo = "ID") {
  const valorSeguro = escapeHtml(String(valor || ""));
  return `
    <td data-label="${escapeHtml(rotulo)}" class="id-cell">
      <span class="id-cell-content">
        <span class="id-text">${formatarIds(valor)}</span>
        <button type="button" class="btn-copiar-id" data-ids="${valorSeguro}" title="Copiar ID" aria-label="Copiar ID">
          <img src="../images/copiar.png?v=4" alt="" class="icone-copiar" aria-hidden="true">
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

function renderizarProximaPagina() {
  const tbody = document.getElementById("resultsBody");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (!tbody) return;

  const inicio = paginaAtual * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;
  const itens = resultadosAtuais.slice(inicio, fim);

  if (!itens.length && paginaAtual === 0) {
    tbody.innerHTML = '<tr><td colspan="8">Nenhum resultado encontrado.</td></tr>';
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  const frag = document.createDocumentFragment();

  itens.forEach((item) => {
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

  if (loadMoreBtn) {
    loadMoreBtn.style.display = fim < resultadosAtuais.length ? "inline-block" : "none";
  }
}

function executarBusca(termo, programa = "", registrar = false) {
  const consulta = String(termo || "").trim();

  resultadosAtuais = SearchEngine.pesquisar(
    DadosMedia.registros,
    consulta,
    { programa }
  );

  paginaAtual = 0;
  const tbody = document.getElementById("resultsBody");
  if (tbody) tbody.innerHTML = "";

  if (consulta) {
    setStatus(`${resultadosAtuais.length} resultado(s) encontrado(s) para “${consulta}”.`);
  } else {
    setStatus(`${resultadosAtuais.length} item(ns) no acervo.`);
  }

  if (registrar && consulta) {
    HistoricoBusca.registrar(consulta);
    HistoricoBusca.renderizar();
    BuscasPopulares.registrar(consulta, programa);
    if (programa) BuscasPopulares.renderizarPrograma(programa);
  }

  renderizarProximaPagina();
}

async function inicializarPaginaInicial() {
  const form = document.getElementById("homeSearchForm");
  const input = document.getElementById("searchInput");
  if (!form || !input) return false;

  BuscasPopulares.renderizarHome();

  try {
    await DadosMedia.carregarCSV();

    AutocompleteBusca.inicializar({
      input,
      registros: DadosMedia.registros,
      containerId: "sugestoesBuscaHome",
      onSelecionar: (termo) => {
        input.value = termo;
        form.requestSubmit();
      }
    });
  } catch (err) {
    console.warn("Autocomplete indisponível na página inicial:", err);
  }

  // A pesquisa é registrada apenas na página de destino. Isso evita que uma
  // busca iniciada na home seja contabilizada duas vezes em buscas populares.
  form.addEventListener("submit", (event) => {
    const termo = input.value.trim();
    if (!termo) event.preventDefault();
  });

  return true;
}

async function inicializarPaginaResultados() {
  const input = document.getElementById("searchInput");
  const tbody = document.getElementById("resultsBody");
  if (!input || !tbody) return false;

  const params = new URLSearchParams(window.location.search);
  const termoInicial = params.get("q") || "";
  const programa = params.get("programa") || "";
  const tituloPrograma = document.getElementById("tituloPrograma");

  input.value = termoInicial;
  if (tituloPrograma) tituloPrograma.textContent = programa || "Todos os Programas";

  HistoricoBusca.inicializar({
    onSelecionar: (termo) => {
      input.value = termo;
      executarBusca(termo, programa, true);
      input.focus();
    }
  });

  if (programa) BuscasPopulares.renderizarPrograma(programa);

  setStatus("Carregando acervo...");

  try {
    await DadosMedia.carregarCSV();
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível carregar o acervo. Verifique sua conexão e tente novamente.");
    return true;
  }

  AutocompleteBusca.inicializar({
    input,
    registros: DadosMedia.registros,
    onSelecionar: (termo) => executarBusca(termo, programa, true)
  });

  executarBusca(termoInicial, programa, Boolean(termoInicial));

  if (typeof inicializarVtsAgricultura === "function") {
    inicializarVtsAgricultura(programa);
  }

  const buscaIncremental = debounce((valor) => {
    executarBusca(valor, programa, false);
  }, 250);

  input.addEventListener("input", (event) => buscaIncremental(event.target.value));

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;

    window.setTimeout(() => {
      executarBusca(input.value, programa, true);
    }, 0);
  });

  document.addEventListener("catalogo:busca-popular", (event) => {
    const termo = event.detail?.termo || "";
    if (!termo) return;
    input.value = termo;
    executarBusca(termo, programa, true);
    input.focus();
  });

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", renderizarProximaPagina);

  document.addEventListener("click", (event) => {
    const botaoCopiar = event.target.closest(".btn-copiar-id");
    if (botaoCopiar) copiarIds(botaoCopiar.dataset.ids, botaoCopiar);
  });

  return true;
}

async function inicializarCatalogo() {
  const inicial = await inicializarPaginaInicial();
  if (!inicial) await inicializarPaginaResultados();
}

document.addEventListener("DOMContentLoaded", inicializarCatalogo);