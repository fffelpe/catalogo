// catalogo-ui.js - Gerencia a renderização da tabela de resultados no DOM
// Funciona tanto em pages/resultado-busca.html quanto em pages/programa.html

let resultadosAtuais = [];
let paginaAtual = 0;
let indiceSugestaoAtiva = -1;
let sugestoesAtuais = [];
const ITENS_POR_PAGINA = 50;
const CHAVE_HISTORICO_BUSCA = "catalogoMidiasHistoricoBusca";
const LIMITE_HISTORICO_BUSCA = 8;
const LIMITE_SUGESTOES = 8;

const STOPWORDS_SUGESTOES = new Set([
  "para", "com", "sem", "sobre", "entre", "pela", "pelo", "pelos", "pelas",
  "uma", "umas", "uns", "dos", "das", "que", "como", "mais", "menos", "depois",
  "antes", "durante", "onde", "quando", "esta", "este", "essa", "esse", "isso",
  "imagens", "imagem", "video", "vídeo", "cenas", "cena", "sonora", "arquivo"
]);

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
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
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
    (item) => normalizarTexto(item) !== normalizarTexto(termoLimpo)
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
  fecharSugestoes();
  executarBusca(termo, programa, false);
}

function montarIndiceSugestoes() {
  const indice = new Map();

  function adicionar(valor, tipo, peso = 1) {
    const texto = String(valor || "").replace(/\s+/g, " ").trim();
    if (texto.length < 2 || texto.length > 70) return;
    const chave = normalizarTexto(texto);
    if (!chave) return;
    const atual = indice.get(chave) || { texto, tipo, peso: 0 };
    atual.peso += peso;
    if (peso > (atual.pesoBase || 0)) {
      atual.texto = texto;
      atual.tipo = tipo;
      atual.pesoBase = peso;
    }
    indice.set(chave, atual);
  }

  DadosMedia.registros.forEach((r) => {
    adicionar(r.PROGRAMA, "Programa", 8);
    adicionar(r.EDITORIA, "Editoria", 7);
    adicionar(r.LOCAL, "Local", 6);
    adicionar(r.REPORTER, "Repórter", 5);
    adicionar(r.AFILIADA_EMISSORA, "Emissora", 5);

    const palavras = String(r.DESCRICAO || "")
      .split(/[^\p{L}\p{N}-]+/u)
      .map((p) => p.trim())
      .filter((p) => p.length >= 4 && !STOPWORDS_SUGESTOES.has(normalizarTexto(p)));

    [...new Set(palavras)].forEach((palavra) => adicionar(palavra, "Descrição", 1));
  });

  DadosMedia.indiceSugestoes = [...indice.values()];
}

function obterSugestoes(termo) {
  const q = normalizarTexto(termo);
  if (q.length < 2 || !Array.isArray(DadosMedia.indiceSugestoes)) return [];

  return DadosMedia.indiceSugestoes
    .map((item) => {
      const textoNormalizado = normalizarTexto(item.texto);
      const inicia = textoNormalizado.startsWith(q);
      const contem = !inicia && textoNormalizado.includes(q);
      if (!inicia && !contem) return null;
      return {
        ...item,
        score: (inicia ? 100 : 40) + Math.min(item.peso, 30) - Math.min(item.texto.length / 20, 3)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.texto.localeCompare(b.texto, "pt-BR"))
    .slice(0, LIMITE_SUGESTOES);
}

function garantirContainerSugestoes() {
  let container = document.getElementById("sugestoesBusca");
  if (container) return container;

  const searchBar = document.querySelector(".search-bar");
  if (!searchBar) return null;
  searchBar.classList.add("search-bar-autocomplete");
  searchBar.setAttribute("role", "combobox");
  searchBar.setAttribute("aria-haspopup", "listbox");

  container = document.createElement("div");
  container.id = "sugestoesBusca";
  container.className = "sugestoes-busca";
  container.setAttribute("role", "listbox");
  container.hidden = true;
  searchBar.appendChild(container);
  return container;
}

function destacarCorrespondencia(texto, termo) {
  const q = normalizarTexto(termo);
  const normalizado = normalizarTexto(texto);
  const inicio = normalizado.indexOf(q);
  if (inicio < 0) return escapeHtml(texto);

  // Na maioria dos casos a normalização preserva os índices de caracteres.
  const antes = texto.slice(0, inicio);
  const meio = texto.slice(inicio, inicio + termo.length);
  const depois = texto.slice(inicio + termo.length);
  return `${escapeHtml(antes)}<strong>${escapeHtml(meio)}</strong>${escapeHtml(depois)}`;
}

function renderizarSugestoes(termo) {
  const container = garantirContainerSugestoes();
  const input = document.getElementById("searchInput");
  if (!container || !input) return;

  sugestoesAtuais = obterSugestoes(termo);
  indiceSugestaoAtiva = -1;
  container.innerHTML = "";

  if (!sugestoesAtuais.length) {
    fecharSugestoes();
    return;
  }

  sugestoesAtuais.forEach((item, index) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "sugestao-item";
    botao.dataset.indice = String(index);
    botao.setAttribute("role", "option");
    botao.setAttribute("aria-selected", "false");
    botao.innerHTML = `
      <span class="sugestao-texto">${destacarCorrespondencia(item.texto, termo)}</span>
      <span class="sugestao-tipo">${escapeHtml(item.tipo)}</span>
    `;
    container.appendChild(botao);
  });

  container.hidden = false;
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-controls", "sugestoesBusca");
}

function fecharSugestoes() {
  const container = document.getElementById("sugestoesBusca");
  const input = document.getElementById("searchInput");
  if (container) {
    container.hidden = true;
    container.querySelectorAll(".sugestao-item").forEach((el) => {
      el.classList.remove("ativa");
      el.setAttribute("aria-selected", "false");
    });
  }
  if (input) input.setAttribute("aria-expanded", "false");
  indiceSugestaoAtiva = -1;
}

function moverSugestaoAtiva(direcao) {
  const container = document.getElementById("sugestoesBusca");
  if (!container || container.hidden || !sugestoesAtuais.length) return false;

  indiceSugestaoAtiva += direcao;
  if (indiceSugestaoAtiva < 0) indiceSugestaoAtiva = sugestoesAtuais.length - 1;
  if (indiceSugestaoAtiva >= sugestoesAtuais.length) indiceSugestaoAtiva = 0;

  container.querySelectorAll(".sugestao-item").forEach((el, index) => {
    const ativa = index === indiceSugestaoAtiva;
    el.classList.toggle("ativa", ativa);
    el.setAttribute("aria-selected", String(ativa));
    if (ativa) el.scrollIntoView({ block: "nearest" });
  });
  return true;
}

function selecionarSugestao(indice, programa) {
  const item = sugestoesAtuais[indice];
  const input = document.getElementById("searchInput");
  if (!item || !input) return;
  input.value = item.texto;
  fecharSugestoes();
  executarBusca(item.texto, programa, true);
  input.focus();
}

async function inicializarBusca() {
  const params = new URLSearchParams(window.location.search);
  const termoInicial = params.get("q") || "";
  const programa = params.get("programa") || "";
  const searchInput = document.getElementById("searchInput");
  const tituloPrograma = document.getElementById("tituloPrograma");

  if (searchInput) {
    searchInput.value = termoInicial;
    searchInput.setAttribute("autocomplete", "off");
    searchInput.setAttribute("aria-autocomplete", "list");
    searchInput.setAttribute("aria-expanded", "false");
  }
  if (tituloPrograma) tituloPrograma.textContent = programa ? decodeURIComponent(programa) : "Todos os Programas";

  renderizarHistoricoBusca();
  setStatus("Carregando acervo...");

  try {
    await DadosMedia.carregarCSV();
    montarIndiceSugestoes();
  } catch (err) {
    setStatus("Não foi possível carregar o acervo. Verifique sua conexão e tente novamente.");
    return;
  }

  executarBusca(termoInicial, programa, Boolean(termoInicial));

  if (typeof inicializarVtsAgricultura === "function") inicializarVtsAgricultura(programa);

  if (searchInput) {
    const buscaIncremental = debounce((valor) => executarBusca(valor, programa, false));

    searchInput.addEventListener("input", (e) => {
      const valor = e.target.value;
      renderizarSugestoes(valor);
      buscaIncremental(valor);
    });

    searchInput.addEventListener("focus", (e) => renderizarSugestoes(e.target.value));

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && moverSugestaoAtiva(1)) {
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp" && moverSugestaoAtiva(-1)) {
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        fecharSugestoes();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (indiceSugestaoAtiva >= 0) selecionarSugestao(indiceSugestaoAtiva, programa);
        else {
          fecharSugestoes();
          executarBusca(e.target.value, programa, true);
        }
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

    const sugestao = event.target.closest(".sugestao-item");
    if (sugestao) {
      selecionarSugestao(Number(sugestao.dataset.indice), programa);
      return;
    }

    const itemHistorico = event.target.closest(".historico-item");
    if (itemHistorico) {
      aplicarTermoDoHistorico(itemHistorico.dataset.termo, programa);
      return;
    }

    if (!event.target.closest(".search-bar")) fecharSugestoes();
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
