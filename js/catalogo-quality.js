// catalogo-quality.js - Regras determinísticas de qualidade dos metadados.

const CatalogoQuality = (() => {
  const DEFINICOES = Object.freeze({
    ID_INVALIDO: { severidade: "critical", mensagem: "Media ID inválido" },
    ID_DUPLICADO: { severidade: "critical", mensagem: "Media ID duplicado" },
    PROGRAMA_AUSENTE: { severidade: "critical", mensagem: "Programa ausente" },
    DESCRICAO_AUSENTE: { severidade: "warning", mensagem: "Descrição ausente" },
    DATA_AUSENTE: { severidade: "warning", mensagem: "Data ausente" },
    DATA_INVALIDA: { severidade: "warning", mensagem: "Data inválida" },
    LOCAL_AUSENTE: { severidade: "warning", mensagem: "Local ausente" },
    REPORTER_AUSENTE: { severidade: "warning", mensagem: "Repórter ausente" },
    CREDITOS_AUSENTES: { severidade: "info", mensagem: "Créditos não encontrados" },
    SEM_SEGMENTOS: { severidade: "info", mensagem: "Sem segmentos indexados" }
  });

  function vazio(valor) {
    return String(valor ?? "").trim() === "";
  }

  function criarProblema(codigo, extras = {}) {
    const definicao = DEFINICOES[codigo];
    if (!definicao) return null;
    return { codigo, ...definicao, ...extras };
  }

  function idsDoRegistro(registro) {
    if (typeof MediaIdUtils === "undefined") return [];
    return MediaIdUtils.extrair(registro?.ID || "");
  }

  function dataValida(valor) {
    const texto = String(valor || "").trim();
    let match = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\D|$)/);
    let ano;
    let mes;
    let dia;

    if (match) {
      [, dia, mes, ano] = match;
      if (ano.length === 2) ano = (Number(ano) < 50 ? "20" : "19") + ano;
    } else {
      match = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/);
      if (!match) return false;
      [, ano, mes, dia] = match;
    }

    const y = Number(ano);
    const m = Number(mes);
    const d = Number(dia);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;

    const data = new Date(y, m - 1, d);
    return data.getFullYear() === y && data.getMonth() === m - 1 && data.getDate() === d;
  }

  function possuiCreditos(ids, contexto) {
    if (typeof contexto.temCreditos === "function") {
      return ids.some((id) => Boolean(contexto.temCreditos(id)));
    }
    if (typeof CreditosMedia !== "undefined" && typeof CreditosMedia.obter === "function") {
      return ids.some((id) => Boolean(CreditosMedia.obter(id)));
    }
    return false;
  }

  function possuiSegmentos(ids, contexto) {
    if (typeof contexto.temSegmentos === "function") {
      return ids.some((id) => Boolean(contexto.temSegmentos(id)));
    }
    if (typeof MediaEnrichment !== "undefined" && typeof MediaEnrichment.obterSegmentos === "function") {
      return ids.some((id) => MediaEnrichment.obterSegmentos(id).length > 0);
    }
    return false;
  }

  function avaliarRegistro(registro = {}, contexto = {}) {
    const problemas = [];
    const ids = idsDoRegistro(registro);

    if (!ids.length) problemas.push(criarProblema("ID_INVALIDO"));

    const duplicados = contexto.idsDuplicados instanceof Set
      ? ids.filter((id) => contexto.idsDuplicados.has(id))
      : [];
    if (duplicados.length) {
      problemas.push(criarProblema("ID_DUPLICADO", { mediaIds: duplicados }));
    }

    if (vazio(registro.PROGRAMA)) problemas.push(criarProblema("PROGRAMA_AUSENTE"));
    if (vazio(registro.DESCRICAO)) problemas.push(criarProblema("DESCRICAO_AUSENTE"));

    if (vazio(registro.DATA)) problemas.push(criarProblema("DATA_AUSENTE"));
    else if (!dataValida(registro.DATA)) problemas.push(criarProblema("DATA_INVALIDA"));

    if (vazio(registro.LOCAL)) problemas.push(criarProblema("LOCAL_AUSENTE"));
    if (vazio(registro.REPORTER)) problemas.push(criarProblema("REPORTER_AUSENTE"));

    if (contexto.creditosStatus === "loaded" && ids.length && !possuiCreditos(ids, contexto)) {
      problemas.push(criarProblema("CREDITOS_AUSENTES"));
    }

    if (contexto.enrichmentStatus !== "failed" && ids.length && !possuiSegmentos(ids, contexto)) {
      problemas.push(criarProblema("SEM_SEGMENTOS"));
    }

    return {
      registro,
      mediaIds: ids,
      problemas,
      severidadeMaxima: problemas.some((item) => item.severidade === "critical")
        ? "critical"
        : problemas.some((item) => item.severidade === "warning")
          ? "warning"
          : problemas.some((item) => item.severidade === "info")
            ? "info"
            : "ok"
    };
  }

  function encontrarDuplicados(registros) {
    const contagem = new Map();
    (Array.isArray(registros) ? registros : []).forEach((registro) => {
      idsDoRegistro(registro).forEach((id) => contagem.set(id, (contagem.get(id) || 0) + 1));
    });
    return new Set([...contagem.entries()].filter(([, total]) => total > 1).map(([id]) => id));
  }

  function avaliarAcervo(registros, contexto = {}) {
    const lista = Array.isArray(registros) ? registros : [];
    const idsDuplicados = encontrarDuplicados(lista);
    return lista.map((registro) => avaliarRegistro(registro, { ...contexto, idsDuplicados }));
  }

  function resumir(relatorio) {
    const lista = Array.isArray(relatorio) ? relatorio : [];
    const resumo = {
      total: lista.length,
      noCritical: 0,
      critical: 0,
      warning: 0,
      info: 0,
      byProblem: {}
    };

    lista.forEach((item) => {
      const problemas = Array.isArray(item?.problemas) ? item.problemas : [];
      if (!problemas.some((problema) => problema.severidade === "critical")) resumo.noCritical++;
      problemas.forEach((problema) => {
        if (problema.severidade === "critical") resumo.critical++;
        else if (problema.severidade === "warning") resumo.warning++;
        else if (problema.severidade === "info") resumo.info++;
        resumo.byProblem[problema.codigo] = (resumo.byProblem[problema.codigo] || 0) + 1;
      });
    });

    return resumo;
  }

  return {
    avaliarRegistro,
    avaliarAcervo,
    resumir,
    criarProblema,
    dataValida,
    DEFINICOES
  };
})();
