// buscas-populares.js
// Registra e exibe buscas populares gerais e por programa.

const BuscasPopulares = (() => {

  const CHAVE = "catalogoMidiasBuscasPopularesV1";

  const LIMITE_GERAL = 6;
  const LIMITE_PROGRAMA = 5;


  const PADROES = {

    geral: [
      "Agricultura",
      "Economia",
      "Chuva",
      "Política",
      "Saúde",
      "Trânsito"
    ],

    programas: {

      "Agrocultura": [
        "Soja",
        "Café",
        "Pecuária",
        "Safra",
        "Colheita"
      ],

      "Cartão Verde": [
        "Futebol",
        "Campeonato",
        "Jogadores",
        "Estádio",
        "Treino"
      ],

      "Documentários": [
        "História",
        "Cultura",
        "Sociedade",
        "Brasil",
        "Arquivo"
      ],

      "De olho no voto": [
        "Eleições",
        "Candidatos",
        "Votação",
        "Campanha",
        "Política"
      ],

      "Jornal da Cultura": [
        "Política",
        "Economia",
        "Brasília",
        "Polícia",
        "São Paulo"
      ],

      "Jornal da Tarde": [
        "São Paulo",
        "Trânsito",
        "Polícia",
        "Economia",
        "Chuva"
      ],

      "Opinião": [
        "Política",
        "Economia",
        "Sociedade",
        "Debate",
        "Brasil"
      ],

      "Linhas Cruzadas": [
        "Sociedade",
        "Política",
        "Cultura",
        "Comportamento",
        "Debate"
      ],

      "Repórter Eco": [
        "Meio ambiente",
        "Sustentabilidade",
        "Floresta",
        "Água",
        "Animais"
      ],

      "Roda Viva": [
        "Entrevista",
        "Política",
        "Economia",
        "Cultura",
        "Brasil"
      ],

      "Esta Manhã": [
        "Notícias",
        "São Paulo",
        "Trânsito",
        "Polícia",
        "Tempo"
      ],

      "Legião Estrangeira": [
        "Internacional",
        "Estados Unidos",
        "Europa",
        "Política internacional",
        "Guerra"
      ],

      "Matéria de Capa": [
        "Ciência",
        "Tecnologia",
        "Sociedade",
        "Saúde",
        "Meio ambiente"
      ]
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


  function carregarDados() {

    try {

      const dados = JSON.parse(
        localStorage.getItem(CHAVE) || "{}"
      );

      return {
        geral:
          dados.geral &&
          typeof dados.geral === "object"
            ? dados.geral
            : {},

        programas:
          dados.programas &&
          typeof dados.programas === "object"
            ? dados.programas
            : {}
      };

    } catch (erro) {

      console.warn(
        "Erro ao carregar buscas populares:",
        erro
      );

      return {
        geral: {},
        programas: {}
      };
    }
  }


  function salvarDados(dados) {
    try {
      localStorage.setItem(
        CHAVE,
        JSON.stringify(dados)
      );
    } catch (erro) {
      console.warn(
        "Erro ao salvar buscas populares:",
        erro
      );
    }
  }


  function pareceMediaId(termo) {
    return /^[A-Z0-9]{7,}$/i.test(
      String(termo || "").replace(/\s+/g, "")
    );
  }


  function chaveTermo(termo) {
    return normalizar(termo);
  }


  function incrementarColecao(colecao, termo) {

    const chave = chaveTermo(termo);

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

    // Não poluímos populares com pesquisas muito curtas
    // ou Media IDs específicos.
    if (
      texto.length < 2 ||
      pareceMediaId(texto)
    ) {
      return;
    }

    const dados = carregarDados();

    incrementarColecao(
      dados.geral,
      texto
    );

    if (programa) {

      const nomePrograma =
        decodeURIComponent(programa).trim();

      if (!dados.programas[nomePrograma]) {
        dados.programas[nomePrograma] = {};
      }

      incrementarColecao(
        dados.programas[nomePrograma],
        texto
      );
    }

    salvarDados(dados);
  }


  function ordenarColecao(colecao) {

    return Object.values(colecao || {})
      .sort((a, b) => {

        if (b.quantidade !== a.quantidade) {
          return b.quantidade - a.quantidade;
        }

        return b.atualizadoEm - a.atualizadoEm;
      });
  }


  function completarComPadrao(
    resultados,
    padroes,
    limite
  ) {

    const existentes = new Set(
      resultados.map((item) =>
        normalizar(item.termo)
      )
    );

    const final = [...resultados];

    for (const termo of padroes) {

      if (final.length >= limite) break;

      if (existentes.has(normalizar(termo))) {
        continue;
      }

      final.push({
        termo,
        quantidade: 0,
        padrao: true
      });

      existentes.add(normalizar(termo));
    }

    return final.slice(0, limite);
  }


  function obterGerais(limite = LIMITE_GERAL) {

    const dados = carregarDados();

    const dinamicas = ordenarColecao(
      dados.geral
    ).slice(0, limite);

    return completarComPadrao(
      dinamicas,
      PADROES.geral,
      limite
    );
  }


  function obterPorPrograma(
    programa,
    limite = LIMITE_PROGRAMA
  ) {

    const nome = decodeURIComponent(
      String(programa || "")
    ).trim();

    const dados = carregarDados();

    const colecao =
      dados.programas[nome] || {};

    const dinamicas = ordenarColecao(
      colecao
    ).slice(0, limite);

    const padroes =
      PADROES.programas[nome] || [];

    return completarComPadrao(
      dinamicas,
      padroes,
      limite
    );
  }


  function criarChip(termo, programa = "") {

    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "busca-popular-chip";

    botao.dataset.termo = termo;

    if (programa) {
      botao.dataset.programa = programa;
    }

    botao.textContent = termo;

    botao.setAttribute(
      "aria-label",
      programa
        ? `Pesquisar ${termo} em ${programa}`
        : `Pesquisar ${termo}`
    );

    return botao;
  }


  function criarLista(termos, programa = "") {

    const lista = document.createElement("div");

    lista.className = "buscas-populares-lista";

    termos.forEach((item) => {
      lista.appendChild(
        criarChip(item.termo, programa)
      );
    });

    return lista;
  }


  function navegarParaBusca(termo, programa = "") {

    const paginaAtual =
      window.location.pathname.toLowerCase();

    const estamosNoIndex =
      paginaAtual.endsWith("/") ||
      paginaAtual.endsWith("/index.html");

    if (estamosNoIndex) {

      if (programa) {
        window.location.href =
          `pages/programa.html?programa=${encodeURIComponent(programa)}&q=${encodeURIComponent(termo)}`;
      } else {
        window.location.href =
          `pages/resultado-busca.html?q=${encodeURIComponent(termo)}`;
      }

      return;
    }

    // Nas páginas internas, disparamos um evento para o catalogo-ui.
    document.dispatchEvent(
      new CustomEvent(
        "catalogo:busca-popular",
        {
          detail: {
            termo,
            programa
          }
        }
      )
    );
  }


  function adicionarEventos(container) {

    container.addEventListener(
      "click",
      (event) => {

        const chip = event.target.closest(
          ".busca-popular-chip"
        );

        if (!chip) return;

        navegarParaBusca(
          chip.dataset.termo,
          chip.dataset.programa || ""
        );
      }
    );
  }


  function criarSecaoInicial() {

    const main = document.querySelector(
      ".pagina-inicial"
    );

    const barra = main?.querySelector(
      ".search-bar"
    );

    if (!main || !barra) return null;

    let secao = document.getElementById(
      "buscasPopularesHome"
    );

    if (secao) return secao;

    secao = document.createElement("section");

    secao.id = "buscasPopularesHome";
    secao.className = "buscas-populares-home";
    secao.setAttribute(
      "aria-label",
      "Buscas populares"
    );

    barra.insertAdjacentElement(
      "afterend",
      secao
    );

    return secao;
  }


  function renderizarHome() {

    const secao = criarSecaoInicial();

    if (!secao) return;

    secao.innerHTML = "";

    const geral = document.createElement("div");

    geral.className = "buscas-populares-geral";

    const titulo = document.createElement("h2");

    titulo.className = "buscas-populares-titulo";
    titulo.textContent = "Buscas populares";

    geral.appendChild(titulo);

    geral.appendChild(
      criarLista(obterGerais())
    );

    secao.appendChild(geral);


    const tituloProgramas =
      document.createElement("h2");

    tituloProgramas.className =
      "buscas-populares-programas-titulo";

    tituloProgramas.textContent =
      "Buscas populares por programa";

    secao.appendChild(tituloProgramas);


    const grade = document.createElement("div");

    grade.className =
      "buscas-populares-programas";

    Object.keys(PADROES.programas)
      .forEach((programa) => {

        const bloco =
          document.createElement("article");

        bloco.className =
          "busca-programa-card";

        const nome =
          document.createElement("h3");

        nome.className =
          "busca-programa-nome";

        nome.textContent = programa;

        bloco.appendChild(nome);

        bloco.appendChild(
          criarLista(
            obterPorPrograma(programa),
            programa
          )
        );

        grade.appendChild(bloco);
      });

    secao.appendChild(grade);

    adicionarEventos(secao);
  }


  function renderizarPrograma(programa) {

    if (!programa) return;

    const searchBar = document.querySelector(
      ".pagina-resultados .search-bar"
    );

    if (!searchBar) return;

    let secao = document.getElementById(
      "buscasPopularesPrograma"
    );

    if (!secao) {

      secao = document.createElement("section");

      secao.id =
        "buscasPopularesPrograma";

      secao.className =
        "buscas-populares-contexto";

      searchBar.insertAdjacentElement(
        "afterend",
        secao
      );

      adicionarEventos(secao);
    }

    secao.innerHTML = "";

    const titulo =
      document.createElement("span");

    titulo.className =
      "buscas-populares-contexto-titulo";

    titulo.textContent =
      `Mais buscados em ${decodeURIComponent(programa)}`;

    secao.appendChild(titulo);

    secao.appendChild(
      criarLista(
        obterPorPrograma(programa),
        programa
      )
    );
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