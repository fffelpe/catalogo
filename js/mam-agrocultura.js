(() => {
  const texto = (valor) => String(valor ?? "").trim();
  const normalizar = (valor) => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  function estaNoAgrocultura() {
    const params = new URLSearchParams(window.location.search);
    return normalizar(params.get("programa") || params.get("p") || "") === "agrocultura";
  }

  function escapeHtml(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function idsDoRegistro(registro) {
    const bruto = Array.isArray(registro.ids) && registro.ids.length
      ? registro.ids.join("\n")
      : (registro.id || registro.ID || "");

    if (typeof MediaIdUtils !== "undefined") return MediaIdUtils.extrair(bruto);
    return texto(bruto).toUpperCase().match(/\d{4}[A-Z]\d{5,6}/g) || [];
  }

  function deduplicarRegistros(registros) {
    const resultado = new Map();
    for (const registro of registros) {
      for (const id of idsDoRegistro(registro)) {
        if (!resultado.has(id)) {
          resultado.set(id, { ...registro, id, ids: [id] });
          continue;
        }
        const anterior = resultado.get(id);
        for (const campo of ["descricao", "reporter", "data", "local", "pgm", "afiliada"]) {
          if (!texto(anterior[campo]) && texto(registro[campo])) anterior[campo] = registro[campo];
        }
      }
    }
    return [...resultado.values()];
  }

  function normalizarCategorias(dados) {
    const vts = deduplicarRegistros(Array.isArray(dados.vts) ? dados.vts : []);
    const noticias = deduplicarRegistros(Array.isArray(dados.noticias) ? dados.noticias : []);
    const idsPrioritarios = new Set([...vts, ...noticias].map((registro) => registro.id));
    const coberturas = deduplicarRegistros(Array.isArray(dados.coberturas) ? dados.coberturas : [])
      .filter((registro) => !idsPrioritarios.has(registro.id));
    return { vts, noticias, coberturas };
  }

  function idsSemCreditos(registros) {
    const faltantes = new Set();
    registros.forEach((registro) => {
      idsDoRegistro(registro).forEach((id) => {
        if (!CreditosMedia.obter(id)) faltantes.add(id);
      });
    });
    return faltantes;
  }

  function contarIdsUnicos(registros) {
    const ids = new Set();
    (Array.isArray(registros) ? registros : []).forEach((registro) => {
      idsDoRegistro(registro).forEach((id) => ids.add(id));
    });
    return ids.size;
  }

  function valorResumo(resumo, chave, fallback) {
    const valor = Number(resumo?.[chave]);
    return Number.isInteger(valor) && valor >= 0 ? valor : fallback;
  }

  function atualizarResumo(acervo, creditosDisponiveis) {
    const todos = [...acervo.vts, ...acervo.noticias, ...acervo.coberturas];
    const resumo = acervo.resumo || {};
    const valores = {
      mamIngestados: contarIdsUnicos(todos),
      mamTotalVts: contarIdsUnicos(acervo.vts),
      mamTotalNoticias: contarIdsUnicos(acervo.noticias),
      mamTotalCoberturas: contarIdsUnicos(acervo.coberturas),
      mamIdsSemCreditos: creditosDisponiveis ? idsSemCreditos(todos).size : "—",
    };

    Object.entries(valores).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = String(valor);
    });
  }

  function renderizarMaisBuscados() {
    const container = document.getElementById("agroMaisBuscadosLista");
    if (!container || typeof BuscasPopulares === "undefined") return;

    const itens = BuscasPopulares.obterPorPrograma("Agrocultura", 4);
    container.innerHTML = "";

    itens.slice(0, 4).forEach((item) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "agro-busca-popular";
      botao.textContent = item.termo;
      botao.addEventListener("click", () => BuscasPopulares.navegarParaBusca(item.termo, "Agrocultura"));
      container.appendChild(botao);
    });
  }

  function celulaId(registro) {
    const valor = idsDoRegistro(registro).join("\n");
    if (typeof renderizarCelulaId === "function") return renderizarCelulaId(valor, "ID");
    return `<td data-label="ID">${escapeHtml(valor)}</td>`;
  }

  function elementosTabela() {
    return {
      topo: document.querySelector("#secaoMamAgro .agro-lista-topo"),
      tabela: document.querySelector("#secaoMamAgro .mam-agro-table-wrap"),
      tbody: document.getElementById("mamAgroBody"),
      titulo: document.getElementById("agroListaTitulo"),
    };
  }

  function ocultarTabela() {
    const { topo, tabela, tbody } = elementosTabela();
    if (topo) topo.hidden = true;
    if (tabela) tabela.hidden = true;
    if (tbody) tbody.innerHTML = "";
    const mais = document.getElementById("agroCarregarMais");
    if (mais) mais.hidden = true;
    const status = document.getElementById("agroListaStatus");
    if (status) status.textContent = "";
    document.querySelectorAll("[data-agro-tipo]").forEach((b) => b.classList.remove("ativo"));
  }

  let abaAtiva = "";
  let limiteVisivel = 40;
  const PASSO_PAGINACAO = 40;

  function renderizarTabela(acervo, filtro) {
    const { topo, tabela, tbody, titulo } = elementosTabela();
    if (!tbody || !filtro) return;

    const mapa = {
      vt: { titulo: "VT'S", registros: acervo.vts },
      noticias: { titulo: "Notícias e Outras Notícias", registros: acervo.noticias },
      cobertura: { titulo: "Imagens de Cobertura", registros: acervo.coberturas },
    };
    const selecao = mapa[filtro];
    if (!selecao) return;

    if (titulo) titulo.textContent = selecao.titulo;
    if (topo) topo.hidden = false;
    if (tabela) tabela.hidden = false;

    const termo = normalizar(document.getElementById("searchInput")?.value || "");
    const palavras = termo.split(/\s+/).filter(Boolean);
    const registros = (Array.isArray(selecao.registros) ? selecao.registros : [])
      .filter((registro) => {
        if (!palavras.length) return true;
        const indice = normalizar([
          registro.id, registro.descricao, registro.reporter, registro.data,
          registro.local, registro.pgm, registro.afiliada, registro.origem,
        ].join(" "));
        return palavras.every((palavra) => indice.includes(palavra));
      });

    const status = document.getElementById("agroListaStatus");
    const mostrarMais = document.getElementById("agroCarregarMais");
    if (status) status.textContent =
      `Exibindo ${Math.min(limiteVisivel, registros.length)} de ${registros.length} Media IDs`;
    if (mostrarMais) mostrarMais.hidden = registros.length <= limiteVisivel;

    if (!registros.length) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhum Media ID encontrado nesta categoria.</td></tr>';
      return;
    }

    tbody.innerHTML = registros.slice(0, limiteVisivel).map((registro) => `
      <tr>
        ${celulaId(registro)}
        <td data-label="Descrição">${escapeHtml(registro.descricao)}</td>
        <td data-label="Repórter">${escapeHtml(registro.reporter)}</td>
        <td data-label="Data">${escapeHtml(registro.data)}</td>
        <td data-label="Local">${escapeHtml(registro.local)}</td>
        <td data-label="PGM">${escapeHtml(registro.pgm)}</td>
      </tr>`).join("");
  }

  function ativarNavbar(acervo) {
    document.querySelectorAll("[data-agro-tipo]").forEach((botao) => {
      botao.classList.remove("ativo");
      botao.addEventListener("click", () => {
        document.querySelectorAll("[data-agro-tipo]").forEach((b) => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        abaAtiva = botao.dataset.agroTipo;
        limiteVisivel = PASSO_PAGINACAO;
        renderizarTabela(acervo, abaAtiva);
      });
    });

    document.getElementById("agroCarregarMais")?.addEventListener("click", () => {
      if (!abaAtiva) return;
      limiteVisivel += PASSO_PAGINACAO;
      renderizarTabela(acervo, abaAtiva);
    });

    document.getElementById("searchInput")?.addEventListener("input", () => {
      if (!abaAtiva) return;
      limiteVisivel = PASSO_PAGINACAO;
      renderizarTabela(acervo, abaAtiva);
    });
  }

  function controlarModoHome() {
    const main = document.querySelector(".pagina-programa");
    const input = document.getElementById("searchInput");
    if (!main || !input) return;

    const atualizar = () => main.classList.toggle("agro-home-mode", !input.value.trim());
    input.addEventListener("input", atualizar);
    atualizar();
  }

  async function carregarAcervo() {
    const resposta = await fetch("../data/agrocultura-acervo.json", { cache: "no-store" });
    if (!resposta.ok) throw new Error(`Falha ao carregar acervo AgroCultura (${resposta.status}).`);
    const dados = await resposta.json();
    if (dados?.parcial) {
      throw new Error("O snapshot do AgroCultura está marcado como parcial e não será exibido.");
    }
    return {
      ...normalizarCategorias(dados),
      resumo: dados.resumo && typeof dados.resumo === "object" ? dados.resumo : {},
      generatedAt: dados.generatedAt || null,
      parcial: false,
      errosFontes: dados.errosFontes || {},
    };
  }

  async function carregarCreditosOpcional() {
    if (typeof CreditosMedia === "undefined") return false;
    try {
      await CreditosMedia.carregar();
      return true;
    } catch (erro) {
      console.warn("Créditos indisponíveis no painel AgroCultura:", erro);
      return false;
    }
  }

  async function iniciar() {
    if (!estaNoAgrocultura()) return;

    document.body.classList.add("pagina-agrocultura");
    document.getElementById("secaoMamAgro")?.removeAttribute("hidden");
    ocultarTabela();

    try {
      const acervo = await carregarAcervo();
      const creditosDisponiveis = await carregarCreditosOpcional();
      atualizarResumo(acervo, creditosDisponiveis);
      renderizarMaisBuscados();
      ativarNavbar(acervo);
      controlarModoHome();

      if (acervo.parcial) {
        console.warn("Painel AgroCultura carregado com fontes parciais:", acervo.errosFontes);
      }
    } catch (erro) {
      console.error("Erro ao montar a página do AgroCultura:", erro);
      ocultarTabela();
      document.getElementById("secaoMamAgro")?.setAttribute("hidden", "");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();