(() => {
  const texto = (valor) => String(valor ?? "").trim();
  const normalizar = (valor) => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  function escapeHtml(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function estaNoAgrocultura() {
    const params = new URLSearchParams(window.location.search);
    return normalizar(params.get("programa") || params.get("p") || "") === "agrocultura";
  }

  function idsDoRegistro(registro) {
    if (typeof CreditosMedia !== "undefined" && CreditosMedia.separarIds) {
      return CreditosMedia.separarIds(registro.ID || "");
    }
    return texto(registro.ID)
      .split(/[\r\n,;]+/)
      .map((id) => id.trim().replace(/\.mp4$/i, "").toUpperCase())
      .filter(Boolean);
  }

  function identificarTipo(registro) {
    const base = normalizar(`${registro.DESCRICAO || ""} ${registro.EDITORIA || ""}`);

    if (
      base.includes("imagens de cobertura") ||
      base.includes("imagem de cobertura") ||
      /\bcobertura\b/.test(base)
    ) return "cobertura";

    if (
      /\bstand[ -]?up(s)?\b/.test(base) ||
      /\bnoticia(s)?\b/.test(base) ||
      /\bnota\b/.test(base) ||
      /\bpassagem\b/.test(base)
    ) return "noticias";

    return "vt";
  }

  function analisarCreditos(registro) {
    const ids = idsDoRegistro(registro);
    const semCreditos = ids.filter((id) => !CreditosMedia.obter(id));
    return { ids, semCreditos };
  }

  function idsUnicos(registros) {
    const conjunto = new Set();
    registros.forEach((registro) => idsDoRegistro(registro).forEach((id) => conjunto.add(id)));
    return conjunto;
  }

  function idsPorTipo(registros, tipo) {
    return idsUnicos(registros.filter((registro) => identificarTipo(registro) === tipo));
  }

  function atualizarResumo(registros) {
    const vts = registros.filter((registro) => identificarTipo(registro) === "vt");
    const vtsSemCreditos = new Set();
    vts.forEach((registro) => analisarCreditos(registro).semCreditos.forEach((id) => vtsSemCreditos.add(id)));

    document.getElementById("mamIngestados").textContent = idsUnicos(registros).size;
    document.getElementById("mamTotalVts").textContent = idsPorTipo(registros, "vt").size;
    document.getElementById("mamTotalNoticias").textContent = idsPorTipo(registros, "noticias").size;
    document.getElementById("mamVtsSemCreditos").textContent = vtsSemCreditos.size;
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

  function filtrar(registros, filtro) {
    if (filtro === "todos") return registros;
    return registros.filter((registro) => identificarTipo(registro) === filtro);
  }

  function renderizarTabela(registros, filtro = "vt") {
    const tbody = document.getElementById("mamAgroBody");
    const titulo = document.getElementById("agroListaTitulo");
    if (!tbody) return;

    const labels = {
      vt: "VT'S",
      noticias: "Notícias e stand-ups",
      cobertura: "Imagens de coberturas"
    };
    if (titulo) titulo.textContent = labels[filtro] || "Materiais";

    const filtrados = filtrar(registros, filtro);
    if (!filtrados.length) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhum material encontrado nesta categoria.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados.map((registro) => {
      const ids = idsDoRegistro(registro).join(", ") || "—";
      return `
        <tr>
          <td data-label="ID">${escapeHtml(ids)}</td>
          <td data-label="Descrição">${escapeHtml(registro.DESCRICAO || "—")}</td>
          <td data-label="Repórter">${escapeHtml(registro.REPORTER || "—")}</td>
          <td data-label="Data">${escapeHtml(registro.DATA || "—")}</td>
          <td data-label="Local">${escapeHtml(registro.LOCAL || "—")}</td>
          <td data-label="PGM">${escapeHtml(registro.PGM || "—")}</td>
        </tr>`;
    }).join("");
  }

  function ativarNavbar(registros) {
    document.querySelectorAll("[data-agro-tipo]").forEach((botao) => {
      botao.addEventListener("click", () => {
        document.querySelectorAll("[data-agro-tipo]").forEach((b) => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        renderizarTabela(registros, botao.dataset.agroTipo);
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

  async function iniciar() {
    if (!estaNoAgrocultura()) return;

    document.body.classList.add("pagina-agrocultura");
    document.getElementById("secaoMamAgro")?.removeAttribute("hidden");
    document.getElementById("secaoVTsAgro")?.setAttribute("hidden", "");

    try {
      await Promise.all([DadosMedia.carregarCSV(), CreditosMedia.carregar()]);
      const registros = DadosMedia.buscarPorPrograma("agrocultura", "");

      atualizarResumo(registros);
      renderizarMaisBuscados();
      ativarNavbar(registros);
      renderizarTabela(registros, "vt");
      controlarModoHome();
    } catch (erro) {
      console.error("Erro ao montar a página do AgroCultura:", erro);
      const tbody = document.getElementById("mamAgroBody");
      if (tbody) tbody.innerHTML = '<tr><td colspan="6">Não foi possível carregar os dados do AgroCultura.</td></tr>';
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
