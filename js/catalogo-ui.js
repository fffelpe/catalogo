// catalogo-ui.js - Integra a interface com busca inteligente, autocomplete,
// histórico, buscas populares, filtros da tabela, paginação, analytics global e cópia de Media IDs.

let resultadosBase = [];
let resultadosAtuais = [];
let paginaAtual = 0;
let consultaAtual = "";
let campoFiltroAberto = "";
const ITENS_POR_PAGINA = 50;
const CAMPOS_FILTRO_CATEGORIA = ["LOCAL", "REPORTER", "AFILIADA_EMISSORA", "PROGRAMA", "EDITORIA"];

function criarFiltrosVazios() {
  return {
    dataInicio: "",
    dataFim: "",
    LOCAL: [],
    REPORTER: [],
    AFILIADA_EMISSORA: [],
    PROGRAMA: [],
    EDITORIA: []
  };
}

let filtrosAtivos = criarFiltrosVazios();

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

    if (elemento.id !== "secaoVTsAgro") elemento.hidden = carregando;
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

  const ehTveEs = /^TVE\s*(?:\/|-)?\s*ES$/.test(normalizado);
  if (ehTveEs) {
    return `<a class="link-afiliada" href="afiliada-tve-es.html">${escapeHtml(texto)}</a>`;
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
    const urlFicha = `media.html?id=${encodeURIComponent(id)}`;
    return `
      <span class="id-item">
        <a class="id-text id-media-link" href="${escapeHtml(urlFicha)}">${idSeguro}</a>
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

function renderizarTrechoEncontrado(item) {
  const match = Array.isArray(item?._SEARCH_SEGMENT_MATCHES)
    ? item._SEARCH_SEGMENT_MATCHES[0]
    : null;
  if (!match) return "";

  const mediaId = MediaIdUtils?.normalizar?.(match.mediaId || separarIds(item.ID)[0]) || "";
  if (!mediaId) return "";
  const url = typeof MediaSegments !== "undefined"
    ? MediaSegments.criarUrlFicha(mediaId, match.start)
    : `media.html?id=${encodeURIComponent(mediaId)}&t=${Math.max(0, Math.floor(Number(match.start) || 0))}`;
  if (!url) return "";

  const timecode = typeof MediaSegments !== "undefined"
    ? MediaSegments.formatarTimecode(match.start)
    : "00:00";

  return `<a class="trecho-encontrado-link" href="${escapeHtml(url)}">Trecho encontrado · ${escapeHtml(timecode)}</a>`;
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
    const trechoEncontrado = renderizarTrechoEncontrado(item);
    tr.innerHTML = `
      ${renderizarCelulaId(item.ID)}
      <td data-label="Descrição">
        <span class="descricao-resultado">${escapeHtml(item.DESCRICAO)}</span>
        ${trechoEncontrado ? `<span class="trecho-encontrado-wrap">${trechoEncontrado}</span>` : ""}
      </td>
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

  if (loadMoreBtn) loadMoreBtn.style.display = fim < resultadosAtuais.length ? "inline-block" : "none";
}

function filtroCampoEstaAtivo(campo) {
  if (campo === "DATA") return Boolean(filtrosAtivos.dataInicio || filtrosAtivos.dataFim);
  return Array.isArray(filtrosAtivos[campo]) && filtrosAtivos[campo].length > 0;
}

function atualizarIndicadoresFiltros() {
  document.querySelectorAll(".btn-filtro-coluna[data-filter-field]").forEach((botao) => {
    const ativo = filtroCampoEstaAtivo(botao.dataset.filterField);
    botao.classList.toggle("filtro-ativo", ativo);
    botao.setAttribute("aria-pressed", ativo ? "true" : "false");
  });

  const limpar = document.getElementById("limparFiltrosTabela");
  if (limpar) {
    limpar.hidden = typeof ResultFilters === "undefined" ? true : !ResultFilters.temFiltros(filtrosAtivos);
  }
}

function atualizarStatusResultados() {
  const possuiFiltros = typeof ResultFilters !== "undefined" && ResultFilters.temFiltros(filtrosAtivos);

  if (possuiFiltros) {
    if (consultaAtual) {
      setStatus(`${resultadosAtuais.length} resultado(s) após os filtros, de ${resultadosBase.length} encontrado(s) para “${consultaAtual}”.`);
    } else {
      setStatus(`${resultadosAtuais.length} item(ns) após os filtros, de ${resultadosBase.length} item(ns) no acervo.`);
    }
    return;
  }

  if (consultaAtual) setStatus(`${resultadosAtuais.length} resultado(s) encontrado(s) para “${consultaAtual}”.`);
  else setStatus(`${resultadosAtuais.length} item(ns) no acervo.`);
}

function aplicarFiltrosTabela() {
  resultadosAtuais = typeof ResultFilters === "undefined"
    ? resultadosBase.slice()
    : ResultFilters.aplicar(resultadosBase, filtrosAtivos);

  paginaAtual = 0;
  const tbody = document.getElementById("resultsBody");
  if (tbody) tbody.innerHTML = "";

  atualizarIndicadoresFiltros();
  atualizarStatusResultados();
  renderizarProximaPagina();
}

function reconciliarFiltrosComResultados() {
  if (typeof ResultFilters === "undefined") return;

  CAMPOS_FILTRO_CATEGORIA.forEach((campo) => {
    const disponiveis = new Set(
      ResultFilters.obterOpcoes(resultadosBase, campo).map((valor) => ResultFilters.normalizarTexto(valor))
    );
    filtrosAtivos[campo] = (filtrosAtivos[campo] || []).filter((valor) =>
      disponiveis.has(ResultFilters.normalizarTexto(valor))
    );
  });
}

function fecharFiltroPopover() {
  const popover = document.getElementById("filtroTabelaPopover");
  if (popover) popover.hidden = true;
  campoFiltroAberto = "";
}

function posicionarFiltroPopover(botao) {
  const popover = document.getElementById("filtroTabelaPopover");
  if (!popover || popover.hidden || !botao) return;

  const margem = 12;
  const rect = botao.getBoundingClientRect();
  const largura = popover.offsetWidth || 300;
  const altura = popover.offsetHeight || 240;
  let left = Math.min(rect.left, window.innerWidth - largura - margem);
  left = Math.max(margem, left);

  let top = rect.bottom + 7;
  if (top + altura > window.innerHeight - margem) {
    top = Math.max(margem, rect.top - altura - 7);
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function limparFiltroCampo(campo) {
  if (campo === "DATA") {
    filtrosAtivos.dataInicio = "";
    filtrosAtivos.dataFim = "";
  } else if (CAMPOS_FILTRO_CATEGORIA.includes(campo)) {
    filtrosAtivos[campo] = [];
  }
  aplicarFiltrosTabela();
}

function renderizarFiltroData(conteudo, botao) {
  conteudo.innerHTML = `
    <p class="filtro-tabela-titulo">Filtrar por data</p>
    <div class="filtro-data-grade">
      <label class="filtro-data-campo">De
        <input type="date" id="filtroDataInicio" value="${escapeHtml(filtrosAtivos.dataInicio)}">
      </label>
      <label class="filtro-data-campo">Até
        <input type="date" id="filtroDataFim" value="${escapeHtml(filtrosAtivos.dataFim)}">
      </label>
    </div>
    <div class="filtro-popover-acoes">
      <button type="button" class="filtro-popover-botao" data-limpar-filtro="DATA">Limpar data</button>
    </div>
  `;

  const inicio = conteudo.querySelector("#filtroDataInicio");
  const fim = conteudo.querySelector("#filtroDataFim");

  const aplicarData = () => {
    filtrosAtivos.dataInicio = inicio?.value || "";
    filtrosAtivos.dataFim = fim?.value || "";
    aplicarFiltrosTabela();
    posicionarFiltroPopover(botao);
  };

  inicio?.addEventListener("change", aplicarData);
  fim?.addEventListener("change", aplicarData);
}

function renderizarFiltroCategoria(campo, conteudo, botao) {
  const nomes = {
    LOCAL: "local",
    REPORTER: "repórter",
    AFILIADA_EMISSORA: "afiliada / emissora",
    PROGRAMA: "programa",
    EDITORIA: "editoria"
  };
  const opcoes = typeof ResultFilters === "undefined" ? [] : ResultFilters.obterOpcoes(resultadosBase, campo);
  const selecionados = new Set((filtrosAtivos[campo] || []).map((valor) => normalizarTexto(valor)));

  const lista = opcoes.map((valor) => {
    const valorSeguro = escapeHtml(valor);
    const marcado = selecionados.has(normalizarTexto(valor)) ? " checked" : "";
    return `
      <label class="filtro-opcao" data-filtro-texto="${escapeHtml(normalizarTexto(valor))}">
        <input type="checkbox" data-filter-value="${valorSeguro}"${marcado}>
        <span>${valorSeguro}</span>
      </label>
    `;
  }).join("");

  conteudo.innerHTML = `
    <p class="filtro-tabela-titulo">Filtrar por ${escapeHtml(nomes[campo] || campo)}</p>
    <input type="search" class="filtro-busca-opcoes" placeholder="Buscar opção..." aria-label="Buscar opção do filtro">
    <div class="filtro-opcoes-lista">
      ${lista || '<p class="filtro-opcoes-vazio">Nenhuma opção disponível nesta busca.</p>'}
    </div>
    <div class="filtro-popover-acoes">
      <button type="button" class="filtro-popover-botao" data-limpar-filtro="${escapeHtml(campo)}">Limpar seleção</button>
    </div>
  `;

  const busca = conteudo.querySelector(".filtro-busca-opcoes");
  busca?.addEventListener("input", () => {
    const termo = normalizarTexto(busca.value);
    conteudo.querySelectorAll(".filtro-opcao").forEach((opcao) => {
      opcao.hidden = termo ? !String(opcao.dataset.filtroTexto || "").includes(termo) : false;
    });
  });

  conteudo.querySelectorAll("input[data-filter-value]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      filtrosAtivos[campo] = Array.from(conteudo.querySelectorAll("input[data-filter-value]:checked"))
        .map((input) => input.dataset.filterValue)
        .filter(Boolean);
      aplicarFiltrosTabela();
      posicionarFiltroPopover(botao);
    });
  });
}

function abrirFiltroPopover(campo, botao) {
  const popover = document.getElementById("filtroTabelaPopover");
  const conteudo = document.getElementById("filtroTabelaConteudo");
  if (!popover || !conteudo) return;

  if (!popover.hidden && campoFiltroAberto === campo) {
    fecharFiltroPopover();
    return;
  }

  campoFiltroAberto = campo;
  if (campo === "DATA") renderizarFiltroData(conteudo, botao);
  else renderizarFiltroCategoria(campo, conteudo, botao);

  popover.hidden = false;
  posicionarFiltroPopover(botao);
}

function limparTodosFiltrosTabela() {
  filtrosAtivos = criarFiltrosVazios();
  fecharFiltroPopover();
  aplicarFiltrosTabela();
}

function inicializarFiltrosTabela() {
  const popover = document.getElementById("filtroTabelaPopover");
  const limparTodos = document.getElementById("limparFiltrosTabela");
  const botoes = document.querySelectorAll(".btn-filtro-coluna[data-filter-field]");
  if (!popover || !botoes.length) return;

  botoes.forEach((botao) => {
    botao.addEventListener("click", (event) => {
      event.stopPropagation();
      abrirFiltroPopover(botao.dataset.filterField, botao);
    });
  });

  limparTodos?.addEventListener("click", limparTodosFiltrosTabela);

  popover.addEventListener("click", (event) => {
    event.stopPropagation();
    const limparCampo = event.target.closest("[data-limpar-filtro]");
    if (!limparCampo) return;
    const campo = limparCampo.dataset.limparFiltro;
    limparFiltroCampo(campo);
    const botao = document.querySelector(`.btn-filtro-coluna[data-filter-field="${campo}"]`);
    if (campo === "DATA") renderizarFiltroData(document.getElementById("filtroTabelaConteudo"), botao);
    else renderizarFiltroCategoria(campo, document.getElementById("filtroTabelaConteudo"), botao);
    posicionarFiltroPopover(botao);
  });

  document.addEventListener("click", (event) => {
    if (popover.hidden) return;
    if (event.target.closest(".filtro-tabela-popover") || event.target.closest(".btn-filtro-coluna")) return;
    fecharFiltroPopover();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharFiltroPopover();
  });

  window.addEventListener("resize", fecharFiltroPopover);
  window.addEventListener("scroll", fecharFiltroPopover, true);
  atualizarIndicadoresFiltros();
}

function registrarAnalyticsGlobal(consulta, programa) {
  if (
    typeof AnalyticsGlobal === "undefined" ||
    typeof AnalyticsGlobal.registrarBusca !== "function" ||
    !AnalyticsGlobal.estaConfigurado()
  ) return;

  AnalyticsGlobal.registrarBusca(consulta, programa, resultadosBase.length)
    .then((gravou) => {
      if (gravou && programa && typeof BuscasPopulares !== "undefined") {
        BuscasPopulares.renderizarPrograma(programa);
      }
    })
    .catch((erro) => console.warn("Nao foi possivel registrar analytics global:", erro));
}

function executarBusca(termo, programa = "", registrar = false) {
  const consulta = String(termo || "").trim();
  consultaAtual = consulta;

  resultadosBase = SearchEngine.pesquisar(
    DadosMedia.registros,
    consulta,
    { programa }
  );

  reconciliarFiltrosComResultados();
  fecharFiltroPopover();

  if (registrar && consulta) {
    HistoricoBusca.registrar(consulta);
    HistoricoBusca.renderizar();
    BuscasPopulares.registrar(consulta, programa);
    registrarAnalyticsGlobal(consulta, programa);
    if (programa) BuscasPopulares.renderizarPrograma(programa);
  }

  aplicarFiltrosTabela();
}

function carregarAutocompleteHomeSobDemanda(input, form) {
  let inicializado = false;
  let carregamento = null;

  return async () => {
    if (inicializado) return;
    if (carregamento) return carregamento;

    carregamento = (async () => {
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
        inicializado = true;
      } catch (err) {
        console.warn("Autocomplete indisponível na página inicial:", err);
      } finally {
        carregamento = null;
      }
    })();

    return carregamento;
  };
}

async function inicializarPaginaInicial() {
  const form = document.getElementById("homeSearchForm");
  const input = document.getElementById("searchInput");
  if (!form || !input) return false;

  if (typeof BuscasPopulares !== "undefined" && typeof BuscasPopulares.renderizarHome === "function") {
    BuscasPopulares.renderizarHome();
  }

  const carregarAutocomplete = carregarAutocompleteHomeSobDemanda(input, form);
  input.addEventListener("focus", carregarAutocomplete, { once: true });
  input.addEventListener("input", carregarAutocomplete, { once: true });

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

  if (typeof MediaEnrichment !== "undefined") {
    try {
      await MediaEnrichment.carregar();
    } catch (err) {
      console.warn("Enriquecimento de mídia indisponível nesta execução:", err);
    }
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

  inicializarFiltrosTabela();
  executarBusca(termoInicial, programa, Boolean(termoInicial));
  definirCarregamentoResultados(false);

  if (typeof inicializarVtsAgricultura === "function") inicializarVtsAgricultura(programa);

  const buscaIncremental = debounce((valor) => executarBusca(valor, programa, false), 250);
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
