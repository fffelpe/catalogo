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

function programaAtualEhAgrocultura() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("programa") || params.get("p") || "").trim().toLowerCase() === "agrocultura";
}

function definirCarregamentoResultados(carregando) {
  const carregamento = document.getElementById("carregamentoResultados");
  const ehAgrocultura = programaAtualEhAgrocultura();

  if (carregamento) carregamento.hidden = !carregando;

  document.querySelectorAll(".area-resultados").forEach((elemento) => {
    const exclusivoAgro = elemento.hasAttribute("data-agro-only");

    if (exclusivoAgro && !ehAgrocultura) {
      elemento.hidden = true;
      return;
    }

    if (elemento.id !== "secaoVTsAgro") {
      elemento.hidden = carregando;
    }
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function renderizarAfiliadaEmissora(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  const normalizado = normalizarTexto(texto);
  if (normalizado.includes("TV BRASIL CENTRAL")) {
    return `<a class="link-afiliada" href="afiliada-tv-brasil-central.html">${escapeHtml(texto)}</a>`;
  }

  return escapeHtml(texto);
}

function separarIds(valor) {
  if (typeof MediaIdUtils !== "undefined") return MediaIdUtils.extrair(valor);
  return String(valor || "")
    .split(/[\r\n,;+\/|&]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function formatarIdsComCopia(valor) {
  return separarIds(valor).map((id) => {
    const idSeguro = escapeHtml(id);
    return `
      <span class="id-item">
        <span class="id-text">${idSeguro}</span>
        <button type="button" class="btn-copiar-id" data-ids="${idSeguro}" title="Copiar ID" aria-label="Copiar ID ${idSeguro}">
          <img src="../images/copiar.png?v=4" alt="" class="icone-copiar" aria-hidden="true">
        </button>
      </span>
    `;
  }).join("");
}

function renderizarCelulaId(valor, rotulo = "ID") {
  return `
    <td data-label="${escapeHtml(rotulo)}" class="id-cell">
      <span class="id-cell-content">
        <span class="id-lista">${formatarIdsComCopia(valor)}</span>
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
      botao.setAttribute("aria-label", `Copiar ID ${botao.dataset.ids || ""}`.trim());
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
      <td data-label="Afiliada / Emissora">${renderizarAfiliadaEmissora(item.AFILIADA_EMISSORA)}</td>
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
  const programa = params.get("programa") || params.get("p") || "";
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

  definirCarregamentoResultados(true);

  try {
    await DadosMedia.carregarCSV();
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível carregar o acervo. Verifique sua conexão e tente novamente.");
    tbody.innerHTML = '<tr><td colspan="8">N&atilde;o foi poss&iacute;vel carregar os resultados.</td></tr>';
    definirCarregamentoResultados(false);
    return true;
  }

  if (typeof CreditosMedia !== "undefined") {
    try {
      await CreditosMedia.carregar();
    } catch (err) {
      console.warn("Busca por créditos indisponível nesta execução:", err);
    }
  }

  AutocompleteBusca.inicializar({
    input,
    registros: DadosMedia.registros,
    onSelecionar: (termo) => executarBusca(termo, programa, true)
  });

  executarBusca(termoInicial, programa, Boolean(termoInicial));
  definirCarregamentoResultados(false);

  if (typeof inicializarVtsAgricultura === "function") {
    inicializarVtsAgricultura(programa);
  }

  const buscaIncremental = debounce((valor) => {
    executarBusca(valor, programa, false);
  }, 250);

  input.addEventListener("input", (event) => buscaIncremental(event.target.value));

  const form = document.getElementById("searchForm");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      executarBusca(input.value, programa, true);
    });
  }

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