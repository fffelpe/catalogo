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

  function distanciaLevenshtein(a, b, limite = 2) {
    if (a === b) return 0;
    if (!a || !b || Math.abs(a.length - b.length) > limite) return limite + 1;

    let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const atual = [i];
      let menor = atual[0];
      for (let j = 1; j <= b.length; j++) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + custo);
        if (atual[j] < menor) menor = atual[j];
      }
      if (menor > limite) return limite + 1;
      anterior = atual;
    }
    return anterior[b.length];
  }

  function scoreFuzzy(texto, consulta) {
    const q = normalizar(consulta);
    if (q.length < 4) return 0;
    const alvo = normalizar(texto);
    const termosConsulta = q.split(" ").filter((item) => item.length >= 4);
    const termosAlvo = alvo.split(" ").filter((item) => item.length >= 4);
    if (!termosConsulta.length || !termosAlvo.length) return 0;

    let total = 0;
    for (const termo of termosConsulta) {
      let melhor = 0;
      const limite = termo.length <= 5 ? 1 : 2;
      for (const candidato of termosAlvo) {
        if (candidato[0] !== termo[0] || Math.abs(candidato.length - termo.length) > limite) continue;
        const distancia = distanciaLevenshtein(termo, candidato, limite);
        if (distancia > limite) continue;
        melhor = Math.max(melhor, 1 - distancia / Math.max(termo.length, candidato.length));
      }
      if (!melhor) return 0;
      total += melhor;
    }

    return total / termosConsulta.length;
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

    const diretas = indice.map((item) => {
      const texto = normalizar(item.texto);
      const inicia = texto.startsWith(q);
      const palavraInicia = !inicia && texto.split(" ").some((p) => p.startsWith(q));
      const contem = !inicia && !palavraInicia && texto.includes(q);
      if (!inicia && !palavraInicia && !contem) return null;
      return { ...item, score: item.peso + (inicia ? 100 : palavraInicia ? 70 : 35), tipoMatch: "direto" };
    }).filter(Boolean)
      .sort((a,b) => b.score - a.score || a.texto.localeCompare(b.texto, "pt-BR"));

    if (diretas.length >= LIMITE || q.length < 4) return diretas.slice(0, LIMITE);

    const chavesDiretas = new Set(diretas.map((item) => normalizar(item.texto)));
    const aproximadas = indice.map((item) => {
      if (chavesDiretas.has(normalizar(item.texto))) return null;
      const similaridade = scoreFuzzy(item.texto, q);
      if (similaridade < 0.68) return null;
      return {
        ...item,
        score: item.peso + 42 * similaridade,
        tipoMatch: "aproximado"
      };
    }).filter(Boolean)
      .sort((a,b) => b.score - a.score || a.texto.localeCompare(b.texto, "pt-BR"));

    return [...diretas, ...aproximadas].slice(0, LIMITE);
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

  return { montarIndice, obterSugestoes, inicializar, renderizar, fechar, distanciaLevenshtein, scoreFuzzy };
})();