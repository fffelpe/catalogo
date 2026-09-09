// buscas-populares.js
// Exibe buscas populares globais quando o AnalyticsGlobal estiver configurado.
// localStorage permanece como fallback para manter o catalogo resiliente.

const BuscasPopulares = (() => {
  const CHAVE = "catalogoMidiasBuscasPopularesV1";
  const LIMITE_GERAL = 6;
  const LIMITE_PROGRAMA = 5;

  const PADROES = {
    geral: ["Agricultura", "Economia", "Chuva", "Política", "Saúde", "Trânsito"],
    programas: {
      "Agrocultura": ["Soja", "Café", "Pecuária", "Safra", "Colheita"],
      "Cartão Verde": ["Futebol", "Campeonato", "Jogadores", "Estádio", "Treino"],
      "Documentários": ["História", "Cultura", "Sociedade", "Brasil", "Arquivo"],
      "De olho no voto": ["Eleições", "Candidatos", "Votação", "Campanha", "Política"],
      "Jornal da Cultura": ["Política", "Economia", "Brasília", "Polícia", "São Paulo"],
      "Jornal da Tarde": ["São Paulo", "Trânsito", "Polícia", "Economia", "Chuva"],
      "Opinião": ["Política", "Economia", "Sociedade", "Debate", "Brasil"],
      "Linhas Cruzadas": ["Sociedade", "Política", "Cultura", "Comportamento", "Debate"],
      "Repórter Eco": ["Meio ambiente", "Sustentabilidade", "Floresta", "Água", "Animais"],
      "Roda Viva": ["Entrevista", "Política", "Economia", "Cultura", "Brasil"],
      "Esta Manhã": ["Notícias", "São Paulo", "Trânsito", "Polícia", "Tempo"],
      "Legião Estrangeira": ["Internacional", "Estados Unidos", "Europa", "Política internacional", "Guerra"],
      "Matéria de Capa": ["Ciência", "Tecnologia", "Sociedade", "Saúde", "Meio ambiente"]
    }
  };

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pareceMediaId(termo) {
    if (typeof MediaIdUtils !== "undefined" && MediaIdUtils.EXATO) {
      return MediaIdUtils.EXATO.test(String(termo || "").trim());
    }
    return /^\d{4}[A-Z]\d{5,6}$/i.test(String(termo || "").trim());
  }

  function carregarDados() {
    try {
      const dados = JSON.parse(localStorage.getItem(CHAVE) || "{}");
      return {
        geral: dados.geral && typeof dados.geral === "object" ? dados.geral : {},
        programas: dados.programas && typeof dados.programas === "object" ? dados.programas : {}
      };
    } catch (erro) {
      console.warn("Erro ao carregar buscas populares locais:", erro);
      return { geral: {}, programas: {} };
    }
  }

  function salvarDados(dados) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch (erro) {
      console.warn("Erro ao salvar buscas populares locais:", erro);
    }
  }

  function incrementarColecao(colecao, termo) {
    const chave = normalizar(termo);
    if (!chave) return;

    if (!colecao[chave]) {
      colecao[chave] = {
        termo: String(termo).trim(),
        quantidade: 0,
        atualizadoEm: Date.now()
      };
    }

    colecao[chave].quantidade += 1;
    colecao[chave].atualizadoEm = Date.now();
  }

  function registrar(termo, programa = "") {
    const texto = String(termo || "").trim();
    if (texto.length < 2 || pareceMediaId(texto)) return;

    const dados = carregarDados();
    incrementarColecao(dados.geral, texto);

    const nomePrograma = String(programa || "").trim();
    if (nomePrograma) {
      if (!dados.programas[nomePrograma]) dados.programas[nomePrograma] = {};
      incrementarColecao(dados.programas[nomePrograma], texto);
    }

    salvarDados(dados);
  }

  function ordenarColecao(colecao) {
    return Object.values(colecao || {}).sort((a, b) => {
      if (b.quantidade !== a.quantidade) return b.quantidade - a.quantidade;
      return (b.atualizadoEm || 0) - (a.atualizadoEm || 0);
    });
  }

  function completarComPadrao(resultados, padroes, limite) {
    const existentes = new Set(resultados.map((item) => normalizar(item.termo)));
    const final = [...resultados];

    for (const termo of padroes) {
      if (final.length >= limite) break;
      if (existentes.has(normalizar(termo))) continue;
      final.push({ termo, quantidade: 0, padrao: true });
      existentes.add(normalizar(termo));
    }

    return final.slice(0, limite);
  }

  function obterGerais(limite = LIMITE_GERAL) {
    const dinamicas = ordenarColecao(carregarDados().geral).slice(0, limite);
    return completarComPadrao(dinamicas, PADROES.geral, limite);
  }

  function obterPorPrograma(programa, limite = LIMITE_PROGRAMA) {
    const nome = String(programa || "").trim();
    const dados = carregarDados();
    const dinamicas = ordenarColecao(dados.programas[nome] || {}).slice(0, limite);
    return completarComPadrao(dinamicas, PADROES.programas[nome] || [], limite);
  }

  function normalizarRespostaGlobal(dados, padroes, limite) {
    const itens = (Array.isArray(dados) ? dados : [])
      .map((item) => ({
        termo: String(item?.termo || "").trim(),
        quantidade: Number(item?.quantidade) || 0,
        global: true
      }))
      .filter((item) => item.termo && !pareceMediaId(item.termo));

    return completarComPadrao(itens, padroes, limite);
  }

  function criarChip(termo, programa = "") {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "busca-popular-chip";
    botao.dataset.termo = termo;
    if (programa) botao.dataset.programa = programa;
    botao.textContent = termo;
    botao.setAttribute(
      "aria-label",
      programa ? `Pesquisar ${termo} em ${programa}` : `Pesquisar ${termo}`
    );
    return botao;
  }

  function criarLista(termos, programa = "") {
    const lista = document.createElement("div");
    lista.className = "buscas-populares-lista";
    termos.forEach((item) => lista.appendChild(criarChip(item.termo, programa)));
    return lista;
  }

  function navegarParaBusca(termo, programa = "") {
    const paginaAtual = window.location.pathname.toLowerCase();
    const estamosNoIndex = paginaAtual.endsWith("/") || paginaAtual.endsWith("/index.html");

    if (estamosNoIndex) {
      window.location.href = programa
        ? `pages/programa.html?programa=${encodeURIComponent(programa)}&q=${encodeURIComponent(termo)}`
        : `pages/resultado-busca.html?q=${encodeURIComponent(termo)}`;
      return;
    }

    document.dispatchEvent(new CustomEvent("catalogo:busca-popular", {
      detail: { termo, programa }
    }));
  }

  function adicionarEventos(container) {
    if (!container || container.dataset.buscasPopularesEventos === "1") return;
    container.dataset.buscasPopularesEventos = "1";

    container.addEventListener("click", (event) => {
      const chip = event.target.closest(".busca-popular-chip");
      if (!chip) return;
      navegarParaBusca(chip.dataset.termo, chip.dataset.programa || "");
    });
  }

  function criarSecaoInicial() {
    const main = document.querySelector(".pagina-inicial");
    const barra = main?.querySelector(".search-bar");
    if (!main || !barra) return null;

    let secao = document.getElementById("buscasPopularesHome");
    if (secao) return secao;

    secao = document.createElement("section");
    secao.id = "buscasPopularesHome";
    secao.className = "buscas-populares-home";
    secao.setAttribute("aria-label", "Buscas populares");
    barra.insertAdjacentElement("afterend", secao);
    return secao;
  }

  function renderizarConteudoHome(secao, itens, global = false) {
    secao.innerHTML = "";
    const geral = document.createElement("div");
    geral.className = "buscas-populares-geral";

    const titulo = document.createElement("h2");
    titulo.className = "buscas-populares-titulo";
    titulo.textContent = "Buscas populares";
    geral.appendChild(titulo);

    const subtitulo = document.createElement("span");
    subtitulo.className = "buscas-populares-origem";
    subtitulo.textContent = global
      ? "Mais pesquisados no catálogo nos últimos 30 dias"
      : "Sugestões e buscas deste navegador";
    geral.appendChild(subtitulo);

    geral.appendChild(criarLista(itens));
    secao.appendChild(geral);
  }

  function renderizarHome() {
    const secao = criarSecaoInicial();
    if (!secao) return;

    adicionarEventos(secao);
    renderizarConteudoHome(secao, obterGerais(), false);

    if (typeof AnalyticsGlobal === "undefined" || !AnalyticsGlobal.estaConfigurado()) return;

    AnalyticsGlobal.obterPopularesGerais(LIMITE_GERAL)
      .then((dados) => {
        if (!dados?.length) return;
        renderizarConteudoHome(
          secao,
          normalizarRespostaGlobal(dados, PADROES.geral, LIMITE_GERAL),
          true
        );
      })
      .catch((erro) => console.warn("Nao foi possivel atualizar buscas populares globais:", erro));
  }

  function garantirSecaoPrograma() {
    const searchBar = document.querySelector(".pagina-resultados .search-bar");
    if (!searchBar) return null;

    let secao = document.getElementById("buscasPopularesPrograma");
    if (!secao) {
      secao = document.createElement("section");
      secao.id = "buscasPopularesPrograma";
      secao.className = "buscas-populares-contexto";
      searchBar.insertAdjacentElement("afterend", secao);
    }
    adicionarEventos(secao);
    return secao;
  }

  function renderizarConteudoPrograma(secao, programa, itens, global = false) {
    secao.innerHTML = "";
    const titulo = document.createElement("span");
    titulo.className = "buscas-populares-contexto-titulo";
    titulo.textContent = global
      ? `Mais buscados em ${programa} nos últimos 30 dias`
      : `Mais buscados em ${programa}`;
    secao.appendChild(titulo);
    secao.appendChild(criarLista(itens, programa));
  }

  function renderizarPrograma(programa) {
    const nome = String(programa || "").trim();
    if (!nome) return;

    const secao = garantirSecaoPrograma();
    if (!secao) return;

    renderizarConteudoPrograma(secao, nome, obterPorPrograma(nome), false);

    if (typeof AnalyticsGlobal === "undefined" || !AnalyticsGlobal.estaConfigurado()) return;

    AnalyticsGlobal.obterPopularesPrograma(nome, LIMITE_PROGRAMA)
      .then((dados) => {
        if (!dados?.length) return;
        renderizarConteudoPrograma(
          secao,
          nome,
          normalizarRespostaGlobal(dados, PADROES.programas[nome] || [], LIMITE_PROGRAMA),
          true
        );
      })
      .catch((erro) => console.warn("Nao foi possivel atualizar buscas populares do programa:", erro));
  }

  return {
    PADROES,
    registrar,
    obterGerais,
    obterPorPrograma,
    renderizarHome,
    renderizarPrograma,
    navegarParaBusca
  };
})();
