// catalogo-quality-ui.js - Painel diagnóstico de qualidade do acervo.

const CatalogoQualityUI = (() => {
  const ITENS_POR_PAGINA = 50;
  let relatorioCompleto = [];
  let paginaAtual = 1;

  function escapeHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }

  function filtrarRelatorio(relatorio, filtros = {}) {
    const programa = normalizar(filtros.programa);
    const severidade = String(filtros.severidade || "").trim();
    const problema = String(filtros.problema || "").trim();

    return (Array.isArray(relatorio) ? relatorio : []).filter((item) => {
      const registro = item?.registro || {};
      const problemas = Array.isArray(item?.problemas) ? item.problemas : [];
      if (programa && normalizar(registro.PROGRAMA) !== programa) return false;
      if (severidade && !problemas.some((entry) => entry.severidade === severidade)) return false;
      if (problema && !problemas.some((entry) => entry.codigo === problema)) return false;
      return true;
    });
  }

  function criarUrlMedia(registro) {
    if (typeof MediaIdUtils === "undefined") return "";
    const id = MediaIdUtils.extrair(registro?.ID || "")[0];
    return id ? `media.html?id=${encodeURIComponent(id)}` : "";
  }

  function paginar(lista, pagina = 1, itensPorPagina = ITENS_POR_PAGINA) {
    const dados = Array.isArray(lista) ? lista : [];
    const tamanho = Number.isInteger(itensPorPagina) && itensPorPagina > 0 ? itensPorPagina : ITENS_POR_PAGINA;
    const totalPaginas = Math.max(1, Math.ceil(dados.length / tamanho));
    const solicitada = Number.isFinite(Number(pagina)) ? Math.floor(Number(pagina)) : 1;
    const paginaValida = Math.min(Math.max(solicitada, 1), totalPaginas);
    const inicio = (paginaValida - 1) * tamanho;
    return {
      itens: dados.slice(inicio, inicio + tamanho),
      pagina: paginaValida,
      totalPaginas,
      total: dados.length,
      inicio: dados.length ? inicio + 1 : 0,
      fim: Math.min(inicio + tamanho, dados.length)
    };
  }

  function obterFiltros() {
    return {
      programa: document.getElementById("qualityProgramFilter")?.value || "",
      severidade: document.getElementById("qualitySeverityFilter")?.value || "",
      problema: document.getElementById("qualityProblemFilter")?.value || ""
    };
  }

  function preencherFiltros() {
    const programaSelect = document.getElementById("qualityProgramFilter");
    if (programaSelect) {
      const programas = [...new Set(relatorioCompleto
        .map((item) => String(item.registro?.PROGRAMA || "").trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      programaSelect.innerHTML = '<option value="">Todos os programas</option>' +
        programas.map((programa) => `<option value="${escapeHtml(programa)}">${escapeHtml(programa)}</option>`).join("");
    }

    const problemaSelect = document.getElementById("qualityProblemFilter");
    if (problemaSelect && typeof CatalogoQuality !== "undefined") {
      problemaSelect.innerHTML = '<option value="">Todos os problemas</option>' +
        Object.entries(CatalogoQuality.DEFINICOES || {}).map(([codigo, definicao]) =>
          `<option value="${escapeHtml(codigo)}">${escapeHtml(definicao.mensagem)}</option>`
        ).join("");
    }
  }

  function definirTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(valor);
  }

  function renderizarResumo() {
    if (typeof CatalogoQuality === "undefined") return;
    const resumo = CatalogoQuality.resumir(relatorioCompleto);
    const percentual = resumo.total ? Math.round((resumo.noCritical / resumo.total) * 100) : 0;

    definirTexto("qualityTotal", resumo.total);
    definirTexto("qualityNoCritical", resumo.noCritical);
    definirTexto("qualityNoCriticalPercent", `${percentual}% do total`);
    definirTexto("qualityMissingDescription", resumo.byProblem.DESCRICAO_AUSENTE || 0);
    definirTexto("qualityMissingLocation", resumo.byProblem.LOCAL_AUSENTE || 0);
    definirTexto("qualityNoSegments", resumo.byProblem.SEM_SEGMENTOS || 0);
    definirTexto("qualityCriticalCount", resumo.critical);
    definirTexto("qualityWarningCount", resumo.warning);
    definirTexto("qualityInfoCount", resumo.info);
  }

  function severidadeLabel(severidade) {
    return ({ critical: "Crítico", warning: "Aviso", info: "Info", ok: "—" })[severidade] || "—";
  }

  function renderizarLinha(item) {
    const registro = item.registro || {};
    const problemas = Array.isArray(item.problemas) ? item.problemas : [];
    const url = criarUrlMedia(registro);
    const idTexto = escapeHtml(registro.ID || "—");
    const idHtml = url
      ? `<a class="quality-id-link" href="${escapeHtml(url)}">${idTexto}</a>`
      : `<span>${idTexto}</span>`;
    const problemasHtml = problemas.length
      ? problemas.map((problema) => `<span class="quality-problem-item">${escapeHtml(problema.mensagem)}</span>`).join("")
      : '<span class="quality-ok">Sem problemas detectados</span>';
    const severidade = item.severidadeMaxima || "ok";

    return `
      <tr>
        <td data-label="ID">${idHtml}</td>
        <td data-label="Descrição">${escapeHtml(registro.DESCRICAO || "—")}</td>
        <td data-label="Programa">${escapeHtml(registro.PROGRAMA || "—")}</td>
        <td data-label="Data">${escapeHtml(registro.DATA || "—")}</td>
        <td data-label="Problemas"><div class="quality-problem-list">${problemasHtml}</div></td>
        <td data-label="Severidade"><span class="quality-severity quality-severity--${escapeHtml(severidade)}">${escapeHtml(severidadeLabel(severidade))}</span></td>
      </tr>
    `;
  }

  function renderizarTabela() {
    const tbody = document.getElementById("qualityResultsBody");
    if (!tbody) return;

    const filtrado = filtrarRelatorio(relatorioCompleto, obterFiltros());
    const pagina = paginar(filtrado, paginaAtual, ITENS_POR_PAGINA);
    paginaAtual = pagina.pagina;

    tbody.innerHTML = pagina.itens.length
      ? pagina.itens.map(renderizarLinha).join("")
      : '<tr><td colspan="6" class="quality-empty">Nenhum registro corresponde aos filtros.</td></tr>';

    definirTexto("qualityPaginationStatus", `Mostrando ${pagina.inicio}-${pagina.fim} de ${pagina.total} registro(s)`);
    definirTexto("qualityPageNumber", `${pagina.pagina} / ${pagina.totalPaginas}`);

    const anterior = document.getElementById("qualityPrevPage");
    const proximo = document.getElementById("qualityNextPage");
    if (anterior) anterior.disabled = pagina.pagina <= 1;
    if (proximo) proximo.disabled = pagina.pagina >= pagina.totalPaginas;
  }

  async function carregarFontes() {
    let creditosStatus = "not-loaded";
    let enrichmentStatus = "not-loaded";
    const tarefas = [];

    if (typeof MediaEnrichment !== "undefined" && typeof MediaEnrichment.carregar === "function") {
      tarefas.push({ tipo: "enrichment", promise: MediaEnrichment.carregar() });
    }
    if (typeof CreditosMedia !== "undefined" && typeof CreditosMedia.carregar === "function") {
      tarefas.push({ tipo: "creditos", promise: CreditosMedia.carregar() });
    }

    const resultados = await Promise.allSettled(tarefas.map((tarefa) => tarefa.promise));
    resultados.forEach((resultado, indice) => {
      const tipo = tarefas[indice].tipo;
      const status = resultado.status === "fulfilled" ? "loaded" : "failed";
      if (tipo === "creditos") creditosStatus = status;
      if (tipo === "enrichment") enrichmentStatus = status;
      if (resultado.status === "rejected") console.warn(`Fonte opcional ${tipo} indisponível no painel:`, resultado.reason);
    });

    return { creditosStatus, enrichmentStatus };
  }

  function vincularEventos() {
    ["qualityProgramFilter", "qualitySeverityFilter", "qualityProblemFilter"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        paginaAtual = 1;
        renderizarTabela();
      });
    });

    document.getElementById("qualityPrevPage")?.addEventListener("click", () => {
      paginaAtual--;
      renderizarTabela();
    });
    document.getElementById("qualityNextPage")?.addEventListener("click", () => {
      paginaAtual++;
      renderizarTabela();
    });
  }

  async function inicializar() {
    const status = document.getElementById("qualityLoadStatus");
    if (!status) return;

    try {
      await DadosMedia.carregarCSV();
    } catch (erro) {
      console.error(erro);
      status.textContent = "Não foi possível carregar o acervo para análise.";
      status.classList.add("quality-load-status--error");
      return;
    }

    const fontes = await carregarFontes();
    const contexto = {
      ...fontes,
      temCreditos: (id) => Boolean(typeof CreditosMedia !== "undefined" && CreditosMedia.obter(id)),
      temSegmentos: (id) => Boolean(typeof MediaEnrichment !== "undefined" && MediaEnrichment.obterSegmentos(id).length)
    };

    relatorioCompleto = CatalogoQuality.avaliarAcervo(DadosMedia.registros, contexto);
    preencherFiltros();
    renderizarResumo();
    vincularEventos();
    renderizarTabela();
    status.hidden = true;
    document.getElementById("qualityDashboard")?.removeAttribute("hidden");
  }

  return {
    filtrarRelatorio,
    criarUrlMedia,
    paginar,
    inicializar
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  CatalogoQualityUI.inicializar();
});
