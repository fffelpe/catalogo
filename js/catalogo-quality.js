// catalogo-quality.js
// Diagnóstico determinístico e somente leitura da qualidade do acervo.

const CatalogoQuality = (() => {
  function problema(codigo, severidade, mensagem) {
    return { codigo, severidade, mensagem };
  }

  function extrairIds(valor) {
    if (typeof MediaIdUtils !== "undefined") return MediaIdUtils.extrair(valor);
    return [];
  }

  function dataValida(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return false;
    let partes = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\D|$)/);
    if (!partes) return /^\d{4}-\d{1,2}-\d{1,2}(?:\D|$)/.test(texto);
    const dia = Number(partes[1]);
    const mes = Number(partes[2]);
    let ano = Number(partes[3]);
    if (partes[3].length === 2) ano += ano < 50 ? 2000 : 1900;
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  }

  function obterEnrichment(id, contexto = {}) {
    if (contexto.enrichment && contexto.enrichment[id]) return contexto.enrichment[id];
    if (typeof MediaEnrichment !== "undefined" && typeof MediaEnrichment.obter === "function") {
      return MediaEnrichment.obter(id);
    }
    return null;
  }

  function avaliarRegistro(registro = {}, contexto = {}) {
    const problemas = [];
    const ids = extrairIds(registro.ID);

    if (!ids.length) problemas.push(problema("ID_INVALIDO", "critical", "Media ID inválido"));
    if (!String(registro.DESCRICAO || "").trim()) {
      problemas.push(problema("DESCRICAO_AUSENTE", "warning", "Descrição ausente"));
    }
    if (!String(registro.DATA || "").trim()) {
      problemas.push(problema("DATA_AUSENTE", "warning", "Data ausente"));
    } else if (!dataValida(registro.DATA)) {
      problemas.push(problema("DATA_INVALIDA", "warning", "Data inválida"));
    }
    if (!String(registro.PROGRAMA || "").trim()) {
      problemas.push(problema("PROGRAMA_AUSENTE", "warning", "Programa ausente"));
    }
    if (!String(registro.LOCAL || "").trim()) {
      problemas.push(problema("LOCAL_AUSENTE", "warning", "Local ausente"));
    }
    if (!String(registro.REPORTER || "").trim()) {
      problemas.push(problema("REPORTER_AUSENTE", "warning", "Repórter ausente"));
    }

    const temSegmentos = ids.some((id) => {
      const enrichment = obterEnrichment(id, contexto);
      return Array.isArray(enrichment?.segments) && enrichment.segments.length > 0;
    });
    if (!temSegmentos) {
      problemas.push(problema("SEM_SEGMENTOS", "info", "Vídeo ainda sem segmentos indexados"));
    }

    if (contexto.creditosCarregados === true && typeof contexto.temCreditos === "function") {
      const temCreditos = ids.some((id) => contexto.temCreditos(id));
      if (!temCreditos) problemas.push(problema("CREDITOS_AUSENTES", "info", "Créditos não encontrados"));
    }

    const severidade = problemas.some((item) => item.severidade === "critical")
      ? "critical"
      : problemas.some((item) => item.severidade === "warning")
        ? "warning"
        : problemas.length ? "info" : "ok";

    return { registro, ids, problemas, severidade };
  }

  function avaliarAcervo(registros = [], contexto = {}) {
    const lista = Array.isArray(registros) ? registros : [];
    const ocorrencias = {};

    lista.forEach((registro, indice) => {
      extrairIds(registro.ID).forEach((id) => {
        if (!ocorrencias[id]) ocorrencias[id] = [];
        ocorrencias[id].push(indice);
      });
    });

    const duplicados = Object.fromEntries(
      Object.entries(ocorrencias)
        .filter(([, indices]) => indices.length > 1)
        .map(([id, indices]) => [id, indices.map((indice) => lista[indice])])
    );

    const avaliados = lista.map((registro) => avaliarRegistro(registro, contexto));
    avaliados.forEach((avaliado, indice) => {
      avaliado.ids.forEach((id) => {
        if (!duplicados[id]) return;
        avaliado.problemas.push(problema("ID_DUPLICADO", "critical", `Media ID duplicado: ${id}`));
        avaliado.severidade = "critical";
        avaliado.registroIndice = indice;
      });
    });

    return {
      registros: avaliados,
      duplicados,
      creditosStatus: contexto.creditosCarregados === true ? "verificado" : "nao_verificado"
    };
  }

  function resumir(relatorio = {}) {
    const registros = Array.isArray(relatorio.registros) ? relatorio.registros : [];
    const porCodigo = {};
    registros.forEach((item) => item.problemas.forEach((p) => {
      porCodigo[p.codigo] = (porCodigo[p.codigo] || 0) + 1;
    }));

    return {
      total: registros.length,
      semProblemasCriticos: registros.filter((item) => item.severidade !== "critical").length,
      critical: registros.filter((item) => item.severidade === "critical").length,
      warning: registros.filter((item) => item.severidade === "warning").length,
      info: registros.filter((item) => item.severidade === "info").length,
      porCodigo,
      creditosStatus: relatorio.creditosStatus || "nao_verificado"
    };
  }

  return { avaliarRegistro, avaliarAcervo, resumir };
})();
