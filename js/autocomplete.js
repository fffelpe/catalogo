// autocomplete.js - Autocomplete inteligente do Catálogo de Mídias
const AutocompleteBusca = (() => {
  const LIMITE = 8;
  const STOPWORDS = new Set([
    "para","com","sem","sobre","entre","pela","pelo","pelos","pelas","uma","umas","uns",
    "dos","das","que","como","mais","menos","depois","antes","durante","onde","quando",
    "esta","este","essa","esse","isso","imagem","imagens","video","vídeo","cena","cenas","arquivo"
  ]);

  let indice = [];
  let sugestoesAtuais = [];
  let indiceAtivo = -1;
  let configuracao = null;

  function normalizar(texto) {
    if (typeof VocabularioJornalistico !== "undefined") return VocabularioJornalistico.normalizar(texto);
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  }

  function escapeHtml(texto) {
    return String(texto || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function montarIndice(registros) {
    const mapa = new Map();

    function adicionar(valor, tipo, peso = 1) {
      const texto = String(valor || "").replace(/\s+/g, " ").trim();
      if (texto.length < 2 || texto.length > 80) return;
      const chave = normalizar(texto);
      if (!chave) return;

      const existente = mapa.get(chave);
      if (!existente) {
        mapa.set(chave, { texto, tipo, peso, pesoBase: peso });
        return;
      }
      existente.peso += peso;
      if (peso > existente.pesoBase) {
        existente.texto = texto;
        existente.tipo = tipo;
        existente.pesoBase = peso;
      }
    }

    (registros || []).forEach((r) => {
      adicionar(r.PROGRAMA, "Programa", 10);
      adicionar(r.EDITORIA, "Editoria", 9);
      adicionar(r.LOCAL, "Local", 8);
      adicionar(r.REPORTER, "Repórter", 7);
      adicionar(r.AFILIADA_EMISSORA, "Emissora", 6);

      const palavras = String(r.DESCRICAO || "")
        .split(/[^\p{L}\p{N}-]+/u)
        .map((p) => p.trim())
        .filter((p) => p.length >= 4 && !STOPWORDS.has(normalizar(p)));

      [...new Set(palavras)].forEach((p) => adicionar(p, "Descrição", 1));
    });

    if (typeof VocabularioJornalistico !== "undefined") {
      VocabularioJornalistico.listarTodos().forEach((grupo) => {
        adicionar(grupo.termo, "Busca inteligente", 15);
        grupo.sinonimos.forEach((t) => adicionar(t, "Sinônimo", 8));
        grupo.relacionados.forEach((t) => adicionar(t, "Relacionado", 4));
      });
    }

    indice = [...mapa.values()];
  }

  function obterSugestoes(consulta) {
    const q = normalizar(consulta);
    if (q.length < 2) return [];

    return indice.map((item) => {
      const texto = normalizar(item.texto);
      const inicia = texto.startsWith(q);
      const palavraInicia = !inicia && texto.split(" ").some((p) => p.startsWith(q));
      const contem = !inicia && !palavraInicia && texto.includes(q);
      if (!inicia && !palavraInicia && !contem) return null;
      return { ...item, score: item.peso + (inicia ? 100 : palavraInicia ? 70 : 35) };
    }).filter(Boolean)
      .sort((a,b) => b.score - a.score || a.texto.localeCompare(b.texto, "pt-BR"))
      .slice(0, LIMITE);
  }

  function destacar(texto, consulta) {
    const q = normalizar(consulta);
    const n = normalizar(texto);
    const inicio = n.indexOf(q);
    if (inicio < 0) return escapeHtml(texto);
    const antes = texto.slice(0, inicio);
    const meio = texto.slice(inicio, inicio + consulta.length);
    const depois = texto.slice(inicio + consulta.length);
    return `${escapeHtml(antes)}<strong>${escapeHtml(meio)}</strong>${escapeHtml(depois)}`;
  }

  function obterContainer() {
    if (!configuracao) return null;
    let container = document.getElementById(configuracao.containerId);
    if (container) return container;
    const barra = configuracao.input.closest(".search-bar");
    if (!barra) return null;
    barra.classList.add("search-bar-autocomplete");
    container = document.createElement("div");
    container.id = configuracao.containerId;
    container.className = "sugestoes-busca";
    container.setAttribute("role", "listbox");
    container.hidden = true;
    barra.appendChild(container);
    return container;
  }

  function fechar() {
    const container = obterContainer();
    if (container) container.hidden = true;
    indiceAtivo = -1;
    if (configuracao?.input) configuracao.input.setAttribute("aria-expanded", "false");
  }

  function renderizar(consulta) {
    const container = obterContainer();
    if (!container) return;
    sugestoesAtuais = obterSugestoes(consulta);
    indiceAtivo = -1;
    container.innerHTML = "";
    if (!sugestoesAtuais.length) return fechar();

    sugestoesAtuais.forEach((item, i) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "sugestao-item";
      botao.dataset.indice = String(i);
      botao.setAttribute("role", "option");
      botao.setAttribute("aria-selected", "false");
      botao.innerHTML = `<span class="sugestao-texto">${destacar(item.texto, consulta)}</span><span class="sugestao-tipo">${escapeHtml(item.tipo)}</span>`;
      container.appendChild(botao);
    });

    container.hidden = false;
    configuracao.input.setAttribute("aria-expanded", "true");
  }

  function mover(direcao) {
    const container = obterContainer();
    if (!container || container.hidden || !sugestoesAtuais.length) return false;
    indiceAtivo += direcao;
    if (indiceAtivo < 0) indiceAtivo = sugestoesAtuais.length - 1;
    if (indiceAtivo >= sugestoesAtuais.length) indiceAtivo = 0;

    container.querySelectorAll(".sugestao-item").forEach((el, i) => {
      const ativo = i === indiceAtivo;
      el.classList.toggle("ativa", ativo);
      el.setAttribute("aria-selected", String(ativo));
      if (ativo) el.scrollIntoView({ block: "nearest" });
    });
    return true;
  }

  function selecionar(i) {
    const item = sugestoesAtuais[i];
    if (!item || !configuracao) return;
    configuracao.input.value = item.texto;
    fechar();
    if (typeof configuracao.onSelecionar === "function") configuracao.onSelecionar(item.texto, item);
  }

  function inicializar(opcoes) {
    const input = typeof opcoes.input === "string" ? document.querySelector(opcoes.input) : opcoes.input;
    if (!input) return;
    configuracao = { input, containerId: opcoes.containerId || "sugestoesBusca", onSelecionar: opcoes.onSelecionar };
    montarIndice(opcoes.registros || []);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");

    input.addEventListener("input", (e) => renderizar(e.target.value));
    input.addEventListener("focus", (e) => renderizar(e.target.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && mover(1)) return e.preventDefault();
      if (e.key === "ArrowUp" && mover(-1)) return e.preventDefault();
      if (e.key === "Escape") return fechar();
      if (e.key === "Enter" && indiceAtivo >= 0) {
        e.preventDefault();
        selecionar(indiceAtivo);
      }
    });

    obterContainer()?.addEventListener("click", (e) => {
      const item = e.target.closest(".sugestao-item");
      if (item) selecionar(Number(item.dataset.indice));
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-bar")) fechar();
    });
  }

  return { montarIndice, obterSugestoes, inicializar, renderizar, fechar };
})();