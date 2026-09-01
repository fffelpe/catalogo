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
    if (Array.isArray(registro.ids) && registro.ids.length) {
      return registro.ids.map((id) => texto(id).toUpperCase()).filter(Boolean);
    }
    return texto(registro.id || registro.ID).toUpperCase().match(/\d{4}B\d{6}/g) || [];
  }

  function idsUnicos(registros) {
    const conjunto = new Set();
    registros.forEach((registro) => idsDoRegistro(registro).forEach((id) => conjunto.add(id)));
    return conjunto;
  }

  function vtsSemCreditos(vts) {
    const faltantes = new Set();
    vts.forEach((registro) => {
      idsDoRegistro(registro).forEach((id) => {
        if (!CreditosMedia.obter(id)) faltantes.add(id);
      });
    });
    return faltantes;
  }

  function atualizarResumo(acervo) {
    const todos = [...acervo.vts, ...acervo.noticias, ...acervo.coberturas];
    document.getElementById("mamIngestados").textContent = idsUnicos(todos).size;
    document.getElementById("mamTotalVts").textContent = idsUnicos(acervo.vts).size;
    document.getElementById("mamTotalNoticias").textContent = idsUnicos(acervo.noticias).size;
    document.getElementById("mamVtsSemCreditos").textContent = vtsSemCreditos(acervo.vts).size;
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
    document.querySelectorAll("[data-agro-tipo]").forEach((b) => b.classList.remove("ativo"));
  }

  function renderizarTabela(acervo, filtro) {
    const { topo, tabela, tbody, titulo } = elementosTabela();
    if (!tbody || !filtro) return;

    const mapa = {
      vt: { titulo: "VT'S", registros: acervo.vts },
      noticias: { titulo: "Notícias e stand-ups", registros: acervo.noticias },
      cobertura: { titulo: "Imagens de coberturas", registros: acervo.coberturas },
    };

    const selecao = mapa[filtro];
    if (!selecao) return;

    if (titulo) titulo.textContent = selecao.titulo;
    if (topo) topo.hidden = false;
    if (tabela) tabela.hidden = false;

    const registros = Array.isArray(selecao.registros) ? selecao.registros : [];
    if (!registros.length) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhum material encontrado nesta categoria.</td></tr>';
      return;
    }

    tbody.innerHTML = registros.map((registro) => `
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
        renderizarTabela(acervo, botao.dataset.agroTipo);
      });
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
    const resposta = await fetch(`../data/agrocultura-acervo.json?v=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`Falha ao carregar acervo AgroCultura (${resposta.status}).`);
    const dados = await resposta.json();
    return {
      vts: Array.isArray(dados.vts) ? dados.vts : [],
      noticias: Array.isArray(dados.noticias) ? dados.noticias : [],
      coberturas: Array.isArray(dados.coberturas) ? dados.coberturas : [],
      generatedAt: dados.generatedAt || null,
    };
  }

  async function iniciar() {
    if (!estaNoAgrocultura()) return;

    document.body.classList.add("pagina-agrocultura");
    document.getElementById("secaoMamAgro")?.removeAttribute("hidden");
    document.getElementById("secaoVTsAgro")?.setAttribute("hidden", "");
    ocultarTabela();

    try {
      const [acervo] = await Promise.all([
        carregarAcervo(),
        CreditosMedia.carregar(),
      ]);

      atualizarResumo(acervo);
      renderizarMaisBuscados();
      ativarNavbar(acervo);
      controlarModoHome();
    } catch (erro) {
      console.error("Erro ao montar a página do AgroCultura:", erro);
      ocultarTabela();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
