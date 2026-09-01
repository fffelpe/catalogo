(() => {
  const texto = (valor) => String(valor ?? "").trim();
  const normalizar = (valor) => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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
    const programa = normalizar(params.get("programa") || params.get("p") || "");
    const titulo = normalizar(document.getElementById("tituloPrograma")?.textContent || "");
    return programa === "agrocultura" || titulo === "agrocultura";
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

    if (/\bstand[ -]?up(s)?\b/.test(base)) return "standup";

    if (
      base.includes("imagens de cobertura") ||
      base.includes("imagem de cobertura") ||
      base.includes("imagens cobertura") ||
      base.includes("cobertura pgm") ||
      /\bcobertura\b/.test(base)
    ) {
      return "cobertura";
    }

    if (/(^|\s|_)vt(\s|_|$)/.test(base) || base.startsWith("vt ")) return "vt";

    return "outro";
  }

  function labelTipo(tipo) {
    if (tipo === "vt") return "VT";
    if (tipo === "standup") return "STAND-UP";
    if (tipo === "cobertura") return "IMAGENS DE COBERTURA";
    return "OUTRO";
  }

  function analisarCreditos(registro) {
    const ids = idsDoRegistro(registro);
    const comCreditos = ids.filter((id) => CreditosMedia.obter(id));
    const semCreditos = ids.filter((id) => !CreditosMedia.obter(id));

    return {
      ids,
      comCreditos,
      semCreditos,
      todosComCreditos: ids.length > 0 && semCreditos.length === 0
    };
  }

  function idsUnicos(registros) {
    const conjunto = new Set();
    registros.forEach((registro) => idsDoRegistro(registro).forEach((id) => conjunto.add(id)));
    return conjunto;
  }

  function idsUnicosPorTipo(registros, tipo) {
    return idsUnicos(registros.filter((registro) => identificarTipo(registro) === tipo));
  }

  function idsSemCreditos(registros) {
    const conjunto = new Set();
    registros.forEach((registro) => {
      analisarCreditos(registro).semCreditos.forEach((id) => conjunto.add(id));
    });
    return conjunto;
  }

  function atualizarResumo(registros) {
    document.getElementById("mamIngestados").textContent = idsUnicos(registros).size;
    document.getElementById("mamTotalVts").textContent = idsUnicosPorTipo(registros, "vt").size;
    document.getElementById("mamTotalStandups").textContent = idsUnicosPorTipo(registros, "standup").size;
    document.getElementById("mamTotalCoberturas").textContent = idsUnicosPorTipo(registros, "cobertura").size;
    document.getElementById("mamIdsSemCreditos").textContent = idsSemCreditos(registros).size;
  }

  function filtrar(registros, filtro) {
    if (filtro === "todos" || filtro === "ingestado") return registros;
    if (["vt", "standup", "cobertura"].includes(filtro)) {
      return registros.filter((registro) => identificarTipo(registro) === filtro);
    }
    if (filtro === "sem-creditos") {
      return registros.filter((registro) => analisarCreditos(registro).semCreditos.length > 0);
    }
    return registros;
  }

  function renderizar(registros, filtro = "todos") {
    const tbody = document.getElementById("mamAgroBody");
    const wrap = document.getElementById("mamAgroTabelaWrap");
    const mensagem = document.getElementById("mamAgroMensagem");
    if (!tbody || !wrap || !mensagem) return;

    const filtrados = filtrar(registros, filtro);

    if (!filtrados.length) {
      tbody.innerHTML = "";
      wrap.hidden = true;
      mensagem.textContent = "Nenhum material encontrado neste filtro.";
      return;
    }

    mensagem.textContent = `${filtrados.length} registro(s) exibido(s).`;
    wrap.hidden = false;

    tbody.innerHTML = filtrados.map((registro) => {
      const tipo = identificarTipo(registro);
      const analise = analisarCreditos(registro);
      const ids = analise.ids.join(", ") || "—";

      let creditosLabel = "Sem ID";
      let creditosClasse = "mam-creditos-nao";

      if (analise.ids.length) {
        if (analise.todosComCreditos) {
          creditosLabel = "Disponíveis";
          creditosClasse = "mam-creditos-ok";
        } else if (analise.comCreditos.length) {
          creditosLabel = `${analise.semCreditos.length} ID(s) sem créditos`;
        } else {
          creditosLabel = "ID sem créditos";
        }
      }

      return `
        <tr>
          <td data-label="Tipo"><span class="mam-tipo mam-tipo-${tipo}">${labelTipo(tipo)}</span></td>
          <td data-label="ID">${escapeHtml(ids)}</td>
          <td data-label="Descrição">${escapeHtml(registro.DESCRICAO || "—")}</td>
          <td data-label="Data">${escapeHtml(registro.DATA || "—")}</td>
          <td data-label="Repórter">${escapeHtml(registro.REPORTER || "—")}</td>
          <td data-label="Afiliada / Emissora">${escapeHtml(registro.AFILIADA_EMISSORA || "—")}</td>
          <td data-label="Créditos"><span class="${creditosClasse}">${escapeHtml(creditosLabel)}</span></td>
        </tr>`;
    }).join("");
  }

  function ativarFiltros(registros) {
    document.querySelectorAll("[data-mam-filtro]").forEach((botao) => {
      botao.addEventListener("click", () => {
        document.querySelectorAll("[data-mam-filtro]").forEach((b) => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        renderizar(registros, botao.dataset.mamFiltro || "todos");
      });
    });
  }

  async function iniciar() {
    const secao = document.getElementById("secaoMamAgro");
    if (!secao || !estaNoAgrocultura()) return;

    secao.hidden = false;
    const mensagem = document.getElementById("mamAgroMensagem");
    if (mensagem) mensagem.textContent = "Carregando dados do acervo...";

    try {
      await Promise.all([
        DadosMedia.carregarCSV(),
        CreditosMedia.carregar()
      ]);

      const registros = DadosMedia.buscarPorPrograma("agrocultura", "");
      const atualizado = document.getElementById("mamAgroAtualizado");
      if (atualizado) atualizado.textContent = "Dados atuais da planilha imgs e dos créditos";

      atualizarResumo(registros);
      ativarFiltros(registros);
      renderizar(registros);
    } catch (erro) {
      console.error("Erro ao carregar painel do acervo do Agrocultura:", erro);
      if (mensagem) mensagem.textContent = "Não foi possível carregar os dados do painel do acervo.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
