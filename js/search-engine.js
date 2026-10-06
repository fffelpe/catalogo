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
    PEOPLE: 32,
    PLACES: 28,
    ORGANIZATIONS: 30,
    SEGMENTS: 38,
    DATA: 5
  };

  const STOPWORDS = new Set([
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no",
    "nas", "nos", "um", "uma", "uns", "umas", "para", "por", "com", "sem", "que"
  ]);

  const CAMPOS_FUZZY = new Set([
    "DESCRICAO", "EDITORIA", "LOCAL", "REPORTER", "PROGRAMA",
    "KEYWORDS", "SUBJECTS", "PEOPLE", "PLACES", "ORGANIZATIONS"
  ]);

  function tokenizar(texto) {
    return normalizar(texto)
      .split(" ")
      .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
  }

  function distanciaLevenshteinLimitada(a, b, limite = 2) {
    if (a === b) return 0;
    if (!a || !b || Math.abs(a.length - b.length) > limite) return limite + 1;

    let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const atual = [i];
      let menorLinha = atual[0];

      for (let j = 1; j <= b.length; j++) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        const valor = Math.min(
          atual[j - 1] + 1,
          anterior[j] + 1,
          anterior[j - 1] + custo
        );
        atual[j] = valor;
        if (valor < menorLinha) menorLinha = valor;
      }

      if (menorLinha > limite) return limite + 1;
      anterior = atual;
    }

    return anterior[b.length];
  }

  function limiteFuzzy(termo) {
    if (termo.length < 4) return 0;
    if (termo.length <= 5) return 1;
    return 2;
  }

  function melhorCorrespondenciaFuzzy(tokens, termo) {
    const limite = limiteFuzzy(termo);
    if (!limite || !Array.isArray(tokens) || !tokens.length) return null;

    let melhor = null;
    for (const token of tokens) {
      if (!token || Math.abs(token.length - termo.length) > limite) continue;
      if (token[0] !== termo[0]) continue;

      const distancia = distanciaLevenshteinLimitada(token, termo, limite);
      if (distancia > limite) continue;

      const similaridade = 1 - (distancia / Math.max(token.length, termo.length));
      if (!melhor || similaridade > melhor.similaridade) {
        melhor = { token, distancia, similaridade };
        if (distancia === 0) break;
      }
    }

    return melhor;
  }

  function mapaConceitos(texto) {
    const mapa = new Map();
    if (
      typeof VocabularioJornalistico === "undefined" ||
      typeof VocabularioJornalistico.extrairConceitos !== "function"
    ) return mapa;

    VocabularioJornalistico.extrairConceitos(texto).forEach((conceito) => {
      const atual = mapa.get(conceito.chave);
      if (!atual || conceito.peso > atual.peso) mapa.set(conceito.chave, conceito);
    });
    return mapa;
  }

  function similaridadeSemantica(conceitosRegistro, conceitosConsulta) {
    if (!(conceitosRegistro instanceof Map) || !(conceitosConsulta instanceof Map)) return 0;
    if (!conceitosRegistro.size || !conceitosConsulta.size) return 0;

    let produto = 0;
    let normaR = 0;
    let normaQ = 0;

    conceitosRegistro.forEach((item) => { normaR += (Number(item.peso) || 0) ** 2; });
    conceitosConsulta.forEach((item) => {
      const pesoQ = Number(item.peso) || 0;
      normaQ += pesoQ ** 2;
      const correspondente = conceitosRegistro.get(item.chave);
      if (correspondente) produto += pesoQ * (Number(correspondente.peso) || 0);
    });

    if (!produto || !normaR || !normaQ) return 0;
    return produto / (Math.sqrt(normaR) * Math.sqrt(normaQ));
  }

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
      ORGANIZATIONS: [],
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

    const textoCompleto = normalizar(Object.values(registro).join(" "));
    const tokensPorCampo = {};
    Object.keys(PESOS_CAMPOS).forEach((campo) => {
      tokensPorCampo[campo] = tokenizar(camposNormalizados[campo] || "");
    });

    const preparado = {
      registro,
      camposNormalizados,
      textoCompleto,
      tokensGerais: [...new Set(tokenizar(textoCompleto))],
      tokensPorCampo,
      conceitos: mapaConceitos(textoCompleto),
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

    const palavrasFuzzy = [...new Set(
      consultaNormalizada
        .split(" ")
        .filter((palavra) => palavra.length >= 4 && !STOPWORDS.has(palavra))
    )];

    return {
      consultaOriginal,
      consultaNormalizada,
      consultaPadroes: criarPadroesTermo(consultaNormalizada),
      expansoes,
      palavrasOriginais,
      palavrasFuzzy,
      conceitos: mapaConceitos(consultaOriginal),
      idConsulta
    };
  }

  function detectarMediaIdExato(preparado, contexto) {
    return Boolean(contexto.idConsulta) && preparado.ids.includes(contexto.idConsulta);
  }
  function calcularFuzzy(preparado, contexto) {
    let total = 0;
    const correspondencias = [];

    for (const palavra of contexto.palavrasFuzzy || []) {
      if (preparado.textoCompleto.includes(palavra)) continue;

      let melhorCampo = null;
      for (const [campo, pesoCampo] of Object.entries(PESOS_CAMPOS)) {
        if (!CAMPOS_FUZZY.has(campo)) continue;
        const match = melhorCorrespondenciaFuzzy(preparado.tokensPorCampo[campo], palavra);
        if (!match) continue;

        const pontos = pesoCampo * 0.42 * match.similaridade;
        if (!melhorCampo || pontos > melhorCampo.pontos) {
          melhorCampo = { campo, termo: palavra, encontrado: match.token, pontos };
        }
      }

      if (melhorCampo) {
        total += melhorCampo.pontos;
        correspondencias.push({
          campo: melhorCampo.campo,
          termo: melhorCampo.termo,
          encontrado: melhorCampo.encontrado,
          tipo: "fuzzy",
          pontos: melhorCampo.pontos
        });
      }
    }

    return { score: total, correspondencias };
  }

  function calcularSemantica(preparado, contexto) {
    const similaridade = similaridadeSemantica(preparado.conceitos, contexto.conceitos);
    if (similaridade <= 0) return { score: 0, correspondencias: [] };

    const compartilhados = [];
    contexto.conceitos.forEach((conceito, chave) => {
      if (preparado.conceitos.has(chave)) compartilhados.push(conceito.termo);
    });

    const score = Math.min(110, 90 * similaridade);
    return {
      score,
      correspondencias: [{
        campo: "SEMANTICA",
        termo: compartilhados.join(", "),
        tipo: "semantico",
        pontos: score
      }]
    };
  }

  function detectarEntidades(preparado, contexto) {
    const entidades = [];
    const candidatos = [
      ["pessoa", "PEOPLE"],
      ["pessoa", "REPORTER"],
      ["local", "PLACES"],
      ["local", "LOCAL"],
      ["organizacao", "ORGANIZATIONS"],
      ["organizacao", "AFILIADA_EMISSORA"]
    ];

    const vistos = new Set();
    for (const [tipo, campo] of candidatos) {
      const bruto = String(preparado.registro[campo] || "").trim();
      const valor = preparado.camposNormalizados[campo] || "";
      if (!bruto || !valor) continue;

      const corresponde = contexto.consultaNormalizada.includes(valor) ||
        (valor.length >= 4 && contexto.consultaNormalizada.split(" ").some((parte) => valor.includes(parte) && parte.length >= 4));
      if (!corresponde) continue;

      const chave = `${tipo}:${valor}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      entidades.push({ tipo, valor: bruto, campo });
    }

    if (
      typeof VocabularioJornalistico !== "undefined" &&
      typeof VocabularioJornalistico.extrairConceitos === "function"
    ) {
      VocabularioJornalistico.extrairConceitos(contexto.consultaOriginal, { incluirRelacionados: false })
        .filter((item) => item.categoria === "organizacao")
        .forEach((item) => {
          const chave = `organizacao:${normalizar(item.termo)}`;
          if (vistos.has(chave)) return;
          vistos.add(chave);
          entidades.push({ tipo: "organizacao", valor: item.termo, campo: "VOCABULARIO" });
        });
    }

    return entidades;
  }


  function registroPodePontuar(preparado, contexto) {
    if (detectarMediaIdExato(preparado, contexto)) return true;

    const texto = preparado.textoCompleto;
    if (!texto) return false;

    if (contexto.expansoes.some((expansao) =>
      expansao.termoNormalizado && texto.includes(expansao.termoNormalizado)
    )) return true;

    if (contexto.palavrasOriginais.some((palavra) =>
      palavra.termoNormalizado && texto.includes(palavra.termoNormalizado)
    )) return true;

    if (similaridadeSemantica(preparado.conceitos, contexto.conceitos) > 0) return true;

    return (contexto.palavrasFuzzy || []).some((palavra) =>
      Boolean(melhorCorrespondenciaFuzzy(preparado.tokensGerais, palavra))
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

    const fuzzy = calcularFuzzy(preparado, contexto);
    score += fuzzy.score;
    correspondencias.push(...fuzzy.correspondencias);

    const semantica = calcularSemantica(preparado, contexto);
    score += semantica.score;
    correspondencias.push(...semantica.correspondencias);

    const entidades = detectarEntidades(preparado, contexto);
    if (entidades.length) {
      const bonusEntidades = Math.min(90, entidades.length * 24);
      score += bonusEntidades;
      correspondencias.push({
        campo: "ENTIDADES",
        termo: entidades.map((item) => item.valor).join(", "),
        tipo: "entidade",
        pontos: bonusEntidades
      });
    }

    const segmentMatches = encontrarMatchesSegmentos(registroOriginal, contexto.consultaOriginal);
    return { score, correspondencias, segmentMatches, entidades };
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
        segmentMatches: relevancia.segmentMatches || [],
        entidades: relevancia.entidades || []
      });
    });

    return avaliados
      .sort((a, b) => b.score - a.score || a.indiceOriginal - b.indiceOriginal)
      .map((item) => ({
        ...item.registro,
        _SEARCH_SCORE: item.score,
        _SEARCH_MATCHES: item.correspondencias,
        _SEARCH_SEGMENT_MATCHES: item.segmentMatches,
        _SEARCH_ENTITIES: item.entidades
      }));
  }

  function explicarResultado(registro) {
    return {
      score: registro._SEARCH_SCORE || 0,
      correspondencias: registro._SEARCH_MATCHES || [],
      segmentos: registro._SEARCH_SEGMENT_MATCHES || [],
      entidades: registro._SEARCH_ENTITIES || []
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
    distanciaLevenshteinLimitada,
    melhorCorrespondenciaFuzzy,
    similaridadeSemantica,
    limparCache
  };
})();
