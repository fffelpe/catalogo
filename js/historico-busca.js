// historico-busca.js
// Histórico local das últimas pesquisas realizadas.

const HistoricoBusca = (() => {

  const CHAVE = "catalogoMidiasHistoricoBusca";
  const LIMITE = 8;


  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }


  function obter() {
    try {
      const dados = JSON.parse(
        localStorage.getItem(CHAVE) || "[]"
      );

      return Array.isArray(dados) ? dados : [];

    } catch (erro) {
      console.warn(
        "Não foi possível carregar o histórico:",
        erro
      );

      return [];
    }
  }


  function registrar(termo) {
    const texto = String(termo || "").trim();

    if (texto.length < 2) return;

    let historico = obter();

    historico = historico.filter(
      (item) => normalizar(item) !== normalizar(texto)
    );

    historico.unshift(texto);

    historico = historico.slice(0, LIMITE);

    try {
      localStorage.setItem(
        CHAVE,
        JSON.stringify(historico)
      );
    } catch (erro) {
      console.warn(
        "Não foi possível salvar o histórico:",
        erro
      );
    }
  }


  function remover(termo) {
    const termoNormalizado = normalizar(termo);

    const novoHistorico = obter().filter(
      (item) => normalizar(item) !== termoNormalizado
    );

    try {
      localStorage.setItem(
        CHAVE,
        JSON.stringify(novoHistorico)
      );
    } catch (erro) {
      console.warn(
        "Não foi possível atualizar o histórico:",
        erro
      );
    }
  }


  function limpar() {
    try {
      localStorage.removeItem(CHAVE);
    } catch (erro) {
      console.warn(
        "Não foi possível limpar o histórico:",
        erro
      );
    }
  }


  function renderizar(opcoes = {}) {

    const container = document.getElementById(
      opcoes.containerId || "historicoBusca"
    );

    const lista = document.getElementById(
      opcoes.listaId || "listaHistoricoBusca"
    );

    if (!container || !lista) return;

    const historico = obter();

    lista.innerHTML = "";

    if (!historico.length) {
      container.hidden = true;
      return;
    }

    container.hidden = false;

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


  function inicializar(opcoes = {}) {

    const botaoLimpar = document.getElementById(
      opcoes.botaoLimparId || "limparHistoricoBtn"
    );

    if (botaoLimpar) {
      botaoLimpar.addEventListener("click", () => {
        limpar();
        renderizar(opcoes);
      });
    }

    const lista = document.getElementById(
      opcoes.listaId || "listaHistoricoBusca"
    );

    if (lista) {
      lista.addEventListener("click", (event) => {

        const item = event.target.closest(
          ".historico-item"
        );

        if (!item) return;

        if (typeof opcoes.onSelecionar === "function") {
          opcoes.onSelecionar(item.dataset.termo);
        }
      });
    }

    renderizar(opcoes);
  }


  return {
    obter,
    registrar,
    remover,
    limpar,
    renderizar,
    inicializar
  };

})();