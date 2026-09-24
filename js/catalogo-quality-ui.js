// catalogo-quality-ui.js
// Renderização do painel de qualidade do catálogo.

const CatalogoQualityUI = (() => {
  let relatorio = null;
  let resumo = null;

  function el(tag, classe, texto) {
    const node = document.createElement(tag);
    if (classe) node.className = classe;
    if (texto != null) node.textContent = String(texto);
    return node;
  }

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }

  function definirEstado(mensagem) {
    const state = document.getElementById("qualityState");
    const content = document.getElementById("qualityContent");
    if (state) {
      state.textContent = mensagem;
      state.hidden = !mensagem;
    }
    if (content) content.hidden = Boolean(mensagem);
  }

  function criarCard(valor, rotulo, classe = "", detalhe = "") {
    const card = el("article", `quality-summary-card ${classe}`.trim());
    card.append(el("strong", "quality-summary-value", valor));
    card.append(el("span", "quality-summary-label", rotulo));
    if (detalhe) card.append(el("small", "quality-summary-detail", detalhe));
    return card;
  }

  function renderResumo() {
    const container = document.getElementById("qualitySummary");
    if (!container || !resumo) return;
    container.textContent = "";
    const total = resumo.total || 0;
    const percentualSemCriticos = total ? Math.round((resumo.semProblemasCriticos / total) * 100) : 0;
    container.append(
      criarCard(total.toLocaleString("pt-BR"), "Registros avaliados", "neutral"),
      criarCard(resumo.semProblemasCriticos.toLocaleString("pt-BR"), "Sem problemas críticos", "success", `${percentualSemCriticos}% do total`),
      criarCard((resumo.porCodigo.DESCRICAO_AUSENTE || 0).toLocaleString("pt-BR"), "Descrições ausentes", "warning"),
      criarCard((resumo.porCodigo.LOCAL_AUSENTE || 0).toLocaleString("pt-BR"), "Locais ausentes", "info"),
      criarCard((resumo.porCodigo.SEM_SEGMENTOS || 0).toLocaleString("pt-BR"), "Sem segmentos", "danger")
    );
  }

  function preencherFiltros() {
    const programa = document.getElementById("qualityProgramFilter");
    const tipo = document.getElementById("qualityTypeFilter");
    if (!programa || !tipo || !relatorio) return;

    const programas = [...new Set(relatorio.registros
      .map((item) => String(item.registro.PROGRAMA || "").trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    programas.forEach((nome) => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      programa.append(option);
    });

    const problemas = new Map();
    relatorio.registros.forEach((item) => item.problemas.forEach((p) => problemas.set(p.codigo, p.mensagem)));
    [...problemas.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
      .forEach(([codigo, mensagem]) => {
        const option = document.createElement("option");
        option.value = codigo;
        option.textContent = mensagem;
        tipo.append(option);
      });
  }

  function criarLinksIds(valor) {
    const wrap = el("div", "quality-id-list");
    const ids = MediaIdUtils.extrair(valor);
    if (!ids.length) {
      wrap.textContent = String(valor || "—");
      return wrap;
    }
    ids.forEach((id) => {
      const link = el("a", "quality-id-link", id);
      link.href = `media.html?id=${encodeURIComponent(id)}`;
      wrap.append(link);
    });
    return wrap;
  }

  function chipSeveridade(severidade) {
    const textos = {
      critical: "Crítica",
      warning: "Aviso",
      info: "Informação",
      ok: "OK"
    };
    return el("span", `quality-severity-chip ${severidade}`, textos[severidade] || severidade);
  }

  function registrosFiltrados() {
    if (!relatorio) return [];
    const programa = document.getElementById("qualityProgramFilter")?.value || "";
    const severidade = document.getElementById("qualitySeverityFilter")?.value || "";
    const tipo = document.getElementById("qualityTypeFilter")?.value || "";

    return relatorio.registros.filter((item) => {
      if (programa && item.registro.PROGRAMA !== programa) return false;
      if (severidade && item.severidade !== severidade) return false;
      if (tipo && !item.problemas.some((p) => p.codigo === tipo)) return false;
      return true;
    });
  }

  function renderTabela() {
    const body = document.getElementById("qualityTableBody");
    const status = document.getElementById("qualityTableStatus");
    if (!body || !status) return;
    body.textContent = "";

    const filtrados = registrosFiltrados();
    const exibidos = filtrados.slice(0, 100);

    exibidos.forEach((item) => {
      const tr = document.createElement("tr");
      const idCell = document.createElement("td");
      idCell.append(criarLinksIds(item.registro.ID));
      tr.append(idCell);
      tr.append(el("td", "", item.registro.DESCRICAO || "Sem descrição"));
      tr.append(el("td", "", item.registro.PROGRAMA || "—"));
      tr.append(el("td", "", item.registro.DATA || "—"));

      const problemasCell = document.createElement("td");
      if (item.problemas.length) {
        const lista = el("div", "quality-problem-list");
        item.problemas.forEach((p) => lista.append(el("span", "quality-problem", p.mensagem)));
        problemasCell.append(lista);
      } else {
        problemasCell.textContent = "—";
      }
      tr.append(problemasCell);

      const severityCell = document.createElement("td");
      severityCell.append(chipSeveridade(item.severidade));
      tr.append(severityCell);
      body.append(tr);
    });

    if (!exibidos.length) {
      const tr = document.createElement("tr");
      const td = el("td", "quality-empty-row", "Nenhum registro corresponde aos filtros.");
      td.colSpan = 6;
      tr.append(td);
      body.append(tr);
    }

    status.textContent = filtrados.length > 100
      ? `Mostrando 100 de ${filtrados.length.toLocaleString("pt-BR")} registros filtrados.`
      : `Mostrando ${filtrados.length.toLocaleString("pt-BR")} registro(s).`;
  }

  async function inicializar() {
    let creditosCarregados = false;
    try {
      await DadosMedia.carregarCSV();
      await MediaEnrichment.carregar();
    } catch (erro) {
      console.error(erro);
      definirEstado("Não foi possível carregar o acervo para avaliação.");
      return;
    }

    if (typeof CreditosMedia !== "undefined") {
      try {
        await CreditosMedia.carregar();
        creditosCarregados = true;
      } catch (erro) {
        console.warn("Créditos não verificados no painel:", erro);
      }
    }

    relatorio = CatalogoQuality.avaliarAcervo(DadosMedia.registros, {
      creditosCarregados,
      temCreditos: (id) => Boolean(CreditosMedia?.obter?.(id))
    });
    resumo = CatalogoQuality.resumir(relatorio);

    definirEstado("");
    renderResumo();
    preencherFiltros();
    renderTabela();

    const creditsStatus = document.getElementById("qualityCreditsStatus");
    if (creditsStatus) {
      creditsStatus.textContent = creditosCarregados
        ? "Créditos: verificados nesta avaliação."
        : "Créditos: não verificados nesta avaliação; a indisponibilidade da fonte não foi tratada como ausência de créditos.";
    }

    ["qualityProgramFilter", "qualitySeverityFilter", "qualityTypeFilter"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", renderTabela);
    });
  }

  return { inicializar };
})();

document.addEventListener("DOMContentLoaded", CatalogoQualityUI.inicializar);
