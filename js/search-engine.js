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
    _AFILIADA_CIDADE: 18,
    _AFILIADA_UF: 14,
    CREDITOS_MATERIA: 30,
    CREDITOS_FONTES: 24,
    CREDITOS_EQUIPE: 20,
    CREDITOS_CARGOS: 12,
    CREDITOS_TEXTO: 16,
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

  const cacheRegistros = new WeakMap();
  const cacheProgramas = new WeakMap();

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

  function criarPadroesTermo(termoNormalizado) {
    if (!termoNormalizado) return null;
    const escapado = escaparRegex(termoNormalizado);
    return {
      termoNormalizado,
      padraoTermo: new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapado}(?=$|[^\\p{L}\\p{N}])`,
        "u"
      ),
      padraoPrefixo: termoNormalizado.length >= 4
        ? new RegExp(`(^|[^\\p{L}\\p{N}])${escapado}`, "u")
        : null,
      padraoOcorrencias: new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapado}(?=$|[^\\p{L}\\p{N}])`,
        "gu"
      )
    };
  }

  function testarPadrao(padrao, texto) {
    if (!padrao || !texto) return false;
    padrao.lastIndex = 0;
    const encontrou = padrao.test(texto);
    padrao.lastIndex = 0;
    return encontrou;
  }

  function contarOcorrenciasPreparadas(texto, padrao) {
    if (!texto || !padrao) return 0;
    padrao.lastIndex = 0;
    let quantidade = 0;
    let match;

    while ((match = padrao.exec(texto)) !== null) {
      quantidade += 1;
      if (match[0] === "") padrao.lastIndex += 1;
    }

    padrao.lastIndex = 0;
    return quantidade;
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

  function calcularScoreCampoPreparado(texto, expansao, pesoCampo) {
    const termo = expansao.termoNormalizado;
    if (!texto || !termo) return 0;

    let score = 0;

    if (texto === termo) {
      score = pesoCampo * 2;
    } else if (testarPadrao(expansao.padraoTermo, texto)) {
      score = pesoCampo;
    } else if (
      podeUsarPrefixo(expansao, termo) &&
      testarPadrao(expansao.padraoPrefixo, texto)
    ) {
      score = pesoCampo * 0.55;
    } else {
      return 0;
    }

    const ocorrencias = contarOcorrenciasPreparadas(texto, expansao.padraoOcorrencias);
    if (ocorrencias > 1) {
      score += Math.min(ocorrencias - 1, 4) * (pesoCampo * 0.08);
    }

    return score * (Number(expansao.peso) || 1);
  }

  function referenciaCreditos() {
    if (
      typeof CreditosMedia === "undefined" ||
      typeof CreditosMedia.camposPesquisa !== "function"
    ) return null;

    return CreditosMedia.registros && typeof CreditosMedia.registros === "object"
      ? CreditosMedia.registros
      : CreditosMedia;
  }

  function referenciaEnriquecimento() {
    if (
      typeof MediaEnrichment === "undefined" ||
      typeof MediaEnrichment.camposPesquisa !== "function"
    ) return null;

    if (typeof MediaEnrichment.todos === "function") {
      const todos = MediaEnrichment.todos();
      if (todos && typeof todos === "object") return todos;
    }

    return MediaEnrichment;
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

  function prepararRegistro(registroOriginal) {
    const refCreditos = referenciaCreditos();
    const refEnriquecimento = referenciaEnriquecimento();
    const existente = cacheRegistros.get(registroOriginal);

    if (
      existente &&
      existente.refCreditos === refCreditos &&
      existente.refEnriquecimento === refEnriquecimento
    ) {
      return existente.preparado;
    }

    const registro = enriquecerRegistro(registroOriginal);
    const camposNormalizados = {};

    Object.keys(PESOS_CAMPOS).forEach((campo) => {
      const valor = registro[campo] || "";
      camposNormalizados[campo] = valor ? normalizar(valor) : "";
    });

    const preparado = {
      registro,
      camposNormalizados,
      textoCompleto: normalizar(Object.values(registro).join(" ")),
      ids: separarIds(registro.ID)
    };

    cacheRegistros.set(registroOriginal, {
      refCreditos,
      refEnriquecimento,
      preparado
    });

    return preparado;
  }

  function prepararExpansao(expansao) {
    const termoNormalizado = normalizar(expansao?.termo || "");
    const padroes = criarPadroesTermo(termoNormalizado);
    if (!padroes) return null;

    return {
      ...expansao,
      ...padroes
    };
  }

  function prepararContextoConsulta(consulta) {
    const consultaOriginal = String(consulta || "");
    const consultaNormalizada = normalizar(consultaOriginal);
    const expansoesOriginais = typeof VocabularioJornalistico !== "undefined"
      ? VocabularioJornalistico.expandirConsulta(consultaOriginal)
      : [{ termo: consultaNormalizada, original: consultaOriginal, tipo: "original", peso: 1 }];

    const expansoes = (Array.isArray(expansoesOriginais) ? expansoesOriginais : [])
      .map(prepararExpansao)
      .filter(Boolean);

    const palavrasOriginais = consultaNormalizada
      .split(" ")
      .filter((palavra) => palavra.length >= 2 && !STOPWORDS.has(palavra))
      .map((palavra) => criarPadroesTermo(palavra))
      .filter(Boolean);

    const idConsulta = typeof MediaIdUtils !== "undefined" && typeof MediaIdUtils.normalizar === "function"
      ? MediaIdUtils.normalizar(consultaOriginal).toLocaleLowerCase("pt-BR")
      : consultaNormalizada.replace(/\s+/g, "");

    return {
      consultaOriginal,
      consultaNormalizada,
      consultaPadroes: criarPadroesTermo(consultaNormalizada),
      expansoes,
      palavrasOriginais,
      idConsulta
    };
  }

  function detectarMediaIdExato(preparado, contexto) {
    return Boolean(contexto.idConsulta) && preparado.ids.includes(contexto.idConsulta);
  }

  function registroPodePontuar(preparado, contexto) {
    if (detectarMediaIdExato(preparado, contexto)) return true;

    const texto = preparado.textoCompleto;
    if (!texto) return false;

    if (contexto.expansoes.some((expansao) =>
      expansao.termoNormalizado && texto.includes(expansao.termoNormalizado)
    )) return true;

    return contexto.palavrasOriginais.some((palavra) =>
      palavra.termoNormalizado && texto.includes(palavra.termoNormalizado)
    );
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

  function calcularRelevanciaPreparada(registroOriginal, preparado, contexto) {
    if (!contexto.consultaNormalizada) {
      return { score: 0, correspondencias: [], segmentMatches: [] };
    }

    if (detectarMediaIdExato(preparado, contexto)) {
      return {
        score: 10000,
        correspondencias: [{ campo: "ID", termo: contexto.consultaOriginal, tipo: "id-exato" }],
        segmentMatches: []
      };
    }

    let score = 0;
    const correspondencias = [];

    Object.entries(PESOS_CAMPOS).forEach(([campo, pesoCampo]) => {
      const textoCampo = preparado.camposNormalizados[campo] || "";
      if (!textoCampo) return;

      contexto.expansoes.forEach((expansao) => {
        const pontos = calcularScoreCampoPreparado(textoCampo, expansao, pesoCampo);
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

    const descricao = preparado.camposNormalizados.DESCRICAO || "";
    if (
      contexto.consultaNormalizada.length >= 3 &&
      testarPadrao(contexto.consultaPadroes?.padraoTermo, descricao)
    ) {
      score += 120;
    }

    if (contexto.palavrasOriginais.length > 1) {
      const quantidadeEncontrada = contexto.palavrasOriginais.filter((palavra) =>
        testarPadrao(palavra.padraoTermo, preparado.textoCompleto) ||
        (
          palavra.termoNormalizado.length >= 4 &&
          testarPadrao(palavra.padraoPrefixo, preparado.textoCompleto)
        )
      ).length;

      if (quantidadeEncontrada === contexto.palavrasOriginais.length) {
        score += 60;
      } else {
        score += quantidadeEncontrada * 10;
      }
    }

    const segmentMatches = encontrarMatchesSegmentos(registroOriginal, contexto.consultaOriginal);
    return { score, correspondencias, segmentMatches };
  }

  function calcularRelevancia(registroOriginal, consulta) {
    const contexto = prepararContextoConsulta(consulta);
    const preparado = prepararRegistro(registroOriginal);
    return calcularRelevanciaPreparada(registroOriginal, preparado, contexto);
  }

  function programaNormalizado(registro) {
    if (cacheProgramas.has(registro)) return cacheProgramas.get(registro);
    const valor = normalizar(registro.PROGRAMA || "");
    cacheProgramas.set(registro, valor);
    return valor;
  }

  function filtrarPrograma(registros, programa) {
    if (!programa) return registros;
    const programaBusca = normalizar(programa);

    return registros.filter((registro) =>
      programaNormalizado(registro).includes(programaBusca)
    );
  }

  function pesquisar(registros, consulta, opcoes = {}) {
    const lista = Array.isArray(registros) ? registros : [];
    const base = filtrarPrograma(lista, opcoes.programa || "");
    const termo = String(consulta || "").trim();

    if (!termo) return base;

    const contexto = prepararContextoConsulta(termo);
    const avaliados = [];

    base.forEach((registro, indiceOriginal) => {
      const preparado = prepararRegistro(registro);
      if (!registroPodePontuar(preparado, contexto)) return;

      const relevancia = calcularRelevanciaPreparada(registro, preparado, contexto);
      if (relevancia.score <= 0) return;

      avaliados.push({
        registro,
        indiceOriginal,
        score: relevancia.score,
        correspondencias: relevancia.correspondencias,
        segmentMatches: relevancia.segmentMatches || []
      });
    });

    return avaliados
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

  function limparCache() {
    // WeakMap não possui clear(); os caches são naturalmente descartados com os registros.
    // Esta função existe como ponto de extensão sem alterar a API pública atual.
  }

  return {
    pesquisar,
    calcularRelevancia,
    explicarResultado,
    normalizar,
    limparCache
  };
})();
