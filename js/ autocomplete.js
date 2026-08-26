// autocomplete.js
// Autocomplete inteligente da caixa de pesquisa.

const AutocompleteBusca = (() => {

  const LIMITE = 8;

  const STOPWORDS = new Set([
    "para",
    "com",
    "sem",
    "sobre",
    "entre",
    "pela",
    "pelo",
    "pelos",
    "pelas",
    "uma",
    "umas",
    "uns",
    "dos",
    "das",
    "que",
    "como",
    "mais",
    "menos",
    "depois",
    "antes",
    "durante",
    "onde",
    "quando",
    "esta",
    "este",
    "essa",
    "esse",
    "isso",
    "imagem",
    "imagens",
    "video",
    "vídeo",
    "cena",
    "cenas",
    "arquivo"
  ]);

  let indice = [];
  let sugestoesAtuais = [];
  let indiceAtivo = -1;
  let configuracao = null;


  function normalizar(texto) {

    if (
      typeof VocabularioJornalistico !== "undefined"
    ) {
      return VocabularioJornalistico.normalizar(
        texto
      );
    }

    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }


  function escapeHtml(texto) {

    return String(texto || "")
      .replace(
        /[&<>"']/g,
        (caractere) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[caractere])
      );
  }


  function montarIndice(registros) {

    const mapa = new Map();


    function adicionar(
      valor,
      tipo,
      peso = 1
    ) {

      const texto = String(valor || "")
        .replace(/\s+/g, " ")
        .trim();

      if (
        texto.length < 2 ||
        texto.length > 80
      ) {
        return;
      }

      const chave = normalizar(texto);

      if (!chave) return;

      const existente = mapa.get(chave);

      if (!existente) {

        mapa.set(chave, {
          texto,
          tipo,
          peso
        });

        return;
      }

      existente.peso += peso;

      if (peso > existente.pesoBase) {
        existente.texto = texto;
        existente.tipo = tipo;
      }
    }


    (registros || []).forEach((registro) => {

      adicionar(
        registro.PROGRAMA,
        "Programa",
        10
      );

      adicionar(
        registro.EDITORIA,
        "Editoria",
        9
      );

      adicionar(
        registro.LOCAL,
        "Local",
        8
      );

      adicionar(
        registro.REPORTER,
        "Repórter",
        7
      );

      adicionar(
        registro.AFILIADA_EMISSORA,
        "Emissora",
        6
      );


      const palavras = String(
        registro.DESCRICAO || ""
      )
        .split(/[^\p{L}\p{N}-]+/u)
        .map((item) => item.trim())
        .filter((item) => {

          const n = normalizar(item);

          return (
            item.length >= 4 &&
            !STOPWORDS.has(n)
          );
        });


      [...new Set(palavras)]
        .forEach((palavra) => {

          adicionar(
            palavra,
            "Descrição",
            1
          );
        });
    });


    if (
      typeof VocabularioJornalistico !==
      "undefined"
    ) {

      VocabularioJornalistico
        .listarTodos()
        .forEach((grupo) => {

          adicionar(
            grupo.termo,
            "Busca inteligente",
            15
          );

          grupo.sinonimos.forEach(
            (termo) => {
              adicionar(
                termo,
                "Sinônimo",
                8
              );
            }
          );

          grupo.relacionados.forEach(
            (termo) => {
              adicionar(
                termo,
                "Relacionado",
                4
              );
            }
          );
        });
    }


    indice = [...mapa.values()];
  }


  function obterSugestoes(consulta) {

    const q = normalizar(consulta);

    if (q.length < 2) return [];


    return indice
      .map((item) => {

        const texto =
          normalizar(item.texto);

        const inicia =
          texto.startsWith(q);

        const palavraInicia =
          !inicia &&
          texto
            .split(" ")
            .some((palavra) =>
              palavra.startsWith(q)
            );

        const contem =
          !inicia &&
          !palavraInicia &&
          texto.includes(q);


        if (
          !inicia &&
          !palavraInicia &&
          !contem
        ) {
          return null;
        }


        let score = item.peso;

        if (inicia) {
          score += 100;
        } else if (palavraInicia) {
          score += 70;
        } else {
          score += 35;
        }


        return {
          ...item,
          score
        };
      })
      .filter(Boolean)
      .sort((a, b) => {

        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.texto.localeCompare(
          b.texto,
          "pt-BR"
        );
      })
      .slice(0, LIMITE);
  }


  function destacar(texto, consulta) {

    const q = normalizar(consulta);
    const normalizado = normalizar(texto);

    const inicio =
      normalizado.indexOf(q);

    if (inicio < 0) {
      return escapeHtml(texto);
    }

    const antes =
      texto.slice(0, inicio);

    const meio =
      texto.slice(
        inicio,
        inicio + consulta.length
      );

    const depois =
      texto.slice(
        inicio + consulta.length
      );

    return (
      escapeHtml(antes) +
      "<strong>" +
      escapeHtml(meio) +
      "</strong>" +
      escapeHtml(depois)
    );
  }


  function obterContainer() {

    if (!configuracao) return null;

    let container =
      document.getElementById(
        configuracao.containerId
      );

    if (container) return container;


    const barra =
      configuracao.input.closest(
        ".search-bar"
      );

    if (!barra) return null;

    barra.classList.add(
      "search-bar-autocomplete"
    );

    container =
      document.createElement("div");

    container.id =
      configuracao.containerId;

    container.className =
      "sugestoes-busca";

    container.setAttribute(
      "role",
      "listbox"
    );

    container.hidden = true;

    barra.appendChild(container);

    return container;
  }


  function fechar() {

    const container =
      obterContainer();

    if (!container) return;

    container.hidden = true;

    indiceAtivo = -1;

    configuracao.input.setAttribute(
      "aria-expanded",
      "false"
    );
  }


  function renderizar(consulta) {

    const container =
      obterContainer();

    if (!container) return;

    sugestoesAtuais =
      obterSugestoes(consulta);

    indiceAtivo = -1;

    container.innerHTML = "";


    if (!sugestoesAtuais.length) {
      fechar();
      return;
    }


    sugestoesAtuais.forEach(
      (item, indiceItem) => {

        const botao =
          document.createElement("button");

        botao.type = "button";

        botao.className =
          "sugestao-item";

        botao.dataset.indice =
          String(indiceItem);

        botao.setAttribute(
          "role",
          "option"
        );


        botao.innerHTML = `
          <span class="sugestao-texto">
            ${destacar(item.texto, consulta)}
          </span>

          <span class="sugestao-tipo">
            ${escapeHtml(item.tipo)}
          </span>
        `;

        container.appendChild(botao);
      }
    );


    container.hidden = false;

    configuracao.input.setAttribute(
      "aria-expanded",
      "true"
    );
  }


  function mover(direcao) {

    const container =
      obterContainer();

    if (
      !container ||
      container.hidden ||
      !sugestoesAtuais.length
    ) {
      return false;
    }


    indiceAtivo += direcao;


    if (indiceAtivo < 0) {
      indiceAtivo =
        sugestoesAtuais.length - 1;
    }


    if (
      indiceAtivo >=
      sugestoesAtuais.length
    ) {
      indiceAtivo = 0;
    }


    container
      .querySelectorAll(
        ".sugestao-item"
      )
      .forEach((elemento, indice) => {

        const ativo =
          indice === indiceAtivo;

        elemento.classList.toggle(
          "ativa",
          ativo
        );

        elemento.setAttribute(
          "aria-selected",
          String(ativo)
        );
      });


    return true;
  }


  function selecionar(indiceSelecionado) {

    const item =
      sugestoesAtuais[indiceSelecionado];

    if (!item) return;

    configuracao.input.value =
      item.texto;

    fechar();


    if (
      typeof configuracao.onSelecionar ===
      "function"
    ) {
      configuracao.onSelecionar(
        item.texto,
        item
      );
    }
  }


  function inicializar(opcoes) {

    const input =
      typeof opcoes.input === "string"
        ? document.querySelector(
            opcoes.input
          )
        : opcoes.input;


    if (!input) return;


    configuracao = {
      input,
      containerId:
        opcoes.containerId ||
        "sugestoesBusca",

      onSelecionar:
        opcoes.onSelecionar
    };


    montarIndice(
      opcoes.registros || []
    );


    input.setAttribute(
      "autocomplete",
      "off"
    );

    input.setAttribute(
      "aria-autocomplete",
      "list"
    );

    input.setAttribute(
      "aria-expanded",
      "false"
    );


    input.addEventListener(
      "input",
      (event) => {
        renderizar(
          event.target.value
        );
      }
    );


    input.addEventListener(
      "focus",
      (event) => {
        renderizar(
          event.target.value
        );
      }
    );


    input.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "ArrowDown" &&
          mover(1)
        ) {
          event.preventDefault();
          return;
        }


        if (
          event.key === "ArrowUp" &&
          mover(-1)
        ) {
          event.preventDefault();
          return;
        }


        if (event.key === "Escape") {
          fechar();
          return;
        }


        if (
          event.key === "Enter" &&
          indiceAtivo >= 0
        ) {
          event.preventDefault();

          selecionar(
            indiceAtivo
          );
        }
      }
    );


    const container =
      obterContainer();


    container?.addEventListener(
      "click",
      (event) => {

        const item =
          event.target.closest(
            ".sugestao-item"
          );

        if (!item) return;

        selecionar(
          Number(item.dataset.indice)
        );
      }
    );


    document.addEventListener(
      "click",
      (event) => {

        if (
          !event.target.closest(
            ".search-bar"
          )
        ) {
          fechar();
        }
      }
    );
  }


  return {
    montarIndice,
    obterSugestoes,
    inicializar,
    renderizar,
    fechar
  };

})();