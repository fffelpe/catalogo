// search-engine.js
// Motor de pesquisa inteligente com ranking por relevância.

const SearchEngine = (() => {
  const PESOS_CAMPOS = {
    ID: 100,
    DESCRICAO: 40,
    EDITORIA: 25,
    LOCAL: 20,
    REPORTER: 18,
    PROGRAMA: 18,
    PGM: 18,
    AFILIADA_EMISSORA: 12,
    CREDITOS_MATERIA: 30,
    CREDITOS_FONTES: 24,
    CREDITOS_EQUIPE: 20,
    CREDITOS_CARGOS: 12,
    KEYWORDS: 32,
    SUBJECTS: 36,
    PEOPLE: 28,
    PLACES: 24,
    SEGMENTS: 38,
    DATA: 5
  };

  const STOPWORDS = new Set([
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no",
    "nas", "nos", "um", "uma", "uns", "umas", "para", "por", "com", "sem", "que"
  ]);

  function normalizar(texto) {
    if (
      typeof VocabularioJornalistico !== "undefined" &&
      typeof VocabularioJornalistico.normalizar === "function"
    ) {
      return VocabularioJornalistico.normalizar(texto);
    }

    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function contemTermo(texto, termo) {
    if (!texto || !termo) return false;
    const padrao = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaparRegex(termo)}(?=$|[^\\p{L}\\p{N}])`,
      "u"
    );
    return padrao.test(texto);
  }

  function contemPrefixoPalavra(texto, termo) {
    if (!texto || !termo || termo.length < 4) return false;
    const padrao = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaparRegex(termo)}`,
      "u"
    );
    return padrao.test(texto);
  }

  function podeUsarPrefixo(expansao, termo) {
    const tipo = String(expansao?.tipo || "").toLowerCase();
    return termo.length >= 4 && (tipo === "original" || tipo === "frase");
  }

  function separarIds(valor) {
    if (typeof MediaIdUtils !== "undefined") {
      return MediaIdUtils.extrair(valor).map((id) => id.toLocaleLowerCase("pt-BR"));
    }
    return String(valor || "")
      .split(/[\r\n,;+\/|&]+/)
      .map((id) => normalizar(id).replace(/\s+/g, ""))
      .filter(Boolean);
  }

  function separarIdsOriginais(valor) {
    if (typeof MediaIdUtils !== "undefined") return MediaIdUtils.extrair(valor);
    return separarIds(valor).map((id) => id.toUpperCase());
  }

  function contarOcorrencias(texto, termo) {
    if (!texto || !termo) return 0;
    const padrao = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaparRegex(termo)}(?=$|[^\\p{L}\\p{N}])`,
      "gu"
    );
    return [...texto.matchAll(padrao)].length;
  }

  function calcularScoreCampo(valor, expansao, pesoCampo) {
    const texto = normalizar(valor);
    const termo = normalizar(expansao.termo);
    if (!texto || !termo) return 0;

    let score = 0;

    if (texto === termo) {
      score = pesoCampo * 2;
    } else if (contemTermo(texto, termo)) {
      score = pesoCampo;
    } else if (podeUsarPrefixo(expansao, termo) && contemPrefixoPalavra(texto, termo)) {
      score = pesoCampo * 0.55;
    } else {
      return 0;
    }

    const ocorrencias = contarOcorrencias(texto, termo);
    if (ocorrencias > 1) {
      score += Math.min(ocorrencias - 1, 4) * (pesoCampo * 0.08);
    }

    return score * (Number(expansao.peso) || 1);
  }

  function detectarMediaIdExato(registro, consulta) {
    const idsRegistro = separarIds(registro.ID);
    const idConsulta = typeof MediaIdUtils !== "undefined"
      ? MediaIdUtils.normalizar(consulta).toLocaleLowerCase("pt-BR")
      : normalizar(consulta).replace(/\s+/g, "");
    return Boolean(idConsulta) && idsRegistro.includes(idConsulta);
  }

  function enriquecerComCreditos(registro) {
    if (
      typeof CreditosMedia === "undefined" ||
      typeof CreditosMedia.camposPesquisa !== "function"
    ) {
      return registro;
    }

    return {
      ...registro,
      ...CreditosMedia.camposPesquisa(registro.ID)
    };
  }

  function enriquecerComMetadados(registro) {
    if (
      typeof MediaEnrichment === "undefined" ||
      typeof MediaEnrichment.camposPesquisa !== "function"
    ) {
      return registro;
    }

    const campos = {
      KEYWORDS: [],
      SUBJECTS: [],
      PEOPLE: [],
      PLACES: [],
      SEGMENTS: []
    };

    separarIdsOriginais(registro.ID).forEach((id) => {
      const enriquecido = MediaEnrichment.camposPesquisa(id) || {};
      Object.keys(campos).forEach((campo) => {
        const valor = String(enriquecido[campo] || "").trim();
        if (valor) campos[campo].push(valor);
      });
    });

    return {
      ...registro,
      ...Object.fromEntries(Object.entries(campos).map(([campo, valores]) => [campo, valores.join(" ")]))
    };
  }

  function enriquecerRegistro(registro) {
    return enriquecerComMetadados(enriquecerComCreditos(registro));
  }

  function encontrarMatchesSegmentos(registro, consulta) {
    if (
      typeof MediaSegments === "undefined" ||
      typeof MediaSegments.buscar !== "function"
    ) return [];

    const matches = [];
    separarIdsOriginais(registro.ID).forEach((id) => {
      MediaSegments.buscar(id, consulta).forEach((segmento) => {
        matches.push({ ...segmento, mediaId: id });
      });
    });

    return matches
      .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.start || 0) - (b.start || 0))
      .slice(0, 5);
  }

  function calcularRelevancia(registroOriginal, consulta) {
    const registro = enriquecerRegistro(registroOriginal);
    const consultaNormalizada = normalizar(consulta);

    if (!consultaNormalizada) {
      return { score: 0, correspondencias: [], segmentMatches: [] };
    }

    if (detectarMediaIdExato(registro, consulta)) {
      return {
        score: 10000,
        correspondencias: [{ campo: "ID", termo: consulta, tipo: "id-exato" }],
        segmentMatches: []
      };
    }

    const expansoes = typeof VocabularioJornalistico !== "undefined"
      ? VocabularioJornalistico.expandirConsulta(consulta)
      : [{ termo: consultaNormalizada, original: consulta, tipo: "original", peso: 1 }];

    let score = 0;
    const correspondencias = [];

    Object.entries(PESOS_CAMPOS).forEach(([campo, pesoCampo]) => {
      const valorCampo = registro[campo] || "";
      if (!valorCampo) return;

      expansoes.forEach((expansao) => {
        const pontos = calcularScoreCampo(valorCampo, expansao, pesoCampo);
        if (pontos <= 0) return;

        score += pontos;
        correspondencias.push({
          campo,
          termo: expansao.original || expansao.termo,
          tipo: expansao.tipo,
          pontos
        });
      });
    });

    const descricao = normalizar(registro.DESCRICAO);
    if (consultaNormalizada.length >= 3 && contemTermo(descricao, consultaNormalizada)) {
      score += 120;
    }

    const palavrasOriginais = consultaNormalizada
      .split(" ")
      .filter((palavra) => palavra.length >= 2 && !STOPWORDS.has(palavra));

    if (palavrasOriginais.length > 1) {
      const textoCompleto = normalizar(Object.values(registro).join(" "));
      const quantidadeEncontrada = palavrasOriginais.filter((palavra) =>
        contemTermo(textoCompleto, palavra) ||
        (palavra.length >= 4 && contemPrefixoPalavra(textoCompleto, palavra))
      ).length;

      if (quantidadeEncontrada === palavrasOriginais.length) {
        score += 60;
      } else {
        score += quantidadeEncontrada * 10;
      }
    }

    const segmentMatches = encontrarMatchesSegmentos(registro, consulta);
    return { score, correspondencias, segmentMatches };
  }

  function filtrarPrograma(registros, programa) {
    if (!programa) return registros;
    const programaNormalizado = normalizar(programa);

    return registros.filter((registro) =>
      normalizar(registro.PROGRAMA).includes(programaNormalizado)
    );
  }

  function pesquisar(registros, consulta, opcoes = {}) {
    const lista = Array.isArray(registros) ? registros : [];
    const base = filtrarPrograma(lista, opcoes.programa || "");
    const termo = String(consulta || "").trim();

    if (!termo) return base;

    return base
      .map((registro, indiceOriginal) => {
        const relevancia = calcularRelevancia(registro, termo);
        return {
          registro,
          indiceOriginal,
          score: relevancia.score,
          correspondencias: relevancia.correspondencias,
          segmentMatches: relevancia.segmentMatches || []
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.indiceOriginal - b.indiceOriginal)
      .map((item) => ({
        ...item.registro,
        _SEARCH_SCORE: item.score,
        _SEARCH_MATCHES: item.correspondencias,
        _SEARCH_SEGMENT_MATCHES: item.segmentMatches
      }));
  }

  function explicarResultado(registro) {
    return {
      score: registro._SEARCH_SCORE || 0,
      correspondencias: registro._SEARCH_MATCHES || [],
      segmentos: registro._SEARCH_SEGMENT_MATCHES || []
    };
  }

  return {
    pesquisar,
    calcularRelevancia,
    explicarResultado,
    normalizar
  };
})();
