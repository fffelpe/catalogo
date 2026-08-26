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
    AFILIADA_EMISSORA: 12,
    DATA: 5
  };


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
      .trim();
  }


  function separarIds(valor) {
    return String(valor || "")
      .split(/[\r\n,;]+/)
      .map((id) => normalizar(id))
      .filter(Boolean);
  }


  function contarOcorrencias(texto, termo) {
    if (!texto || !termo) return 0;

    let contador = 0;
    let posicao = 0;

    while ((posicao = texto.indexOf(termo, posicao)) !== -1) {
      contador++;
      posicao += termo.length;
    }

    return contador;
  }


  function calcularScoreCampo(valor, expansao, pesoCampo) {
    const texto = normalizar(valor);
    const termo = expansao.termo;

    if (!texto || !termo) return 0;

    let score = 0;

    if (texto === termo) {
      score += pesoCampo * 2;
    } else if (texto.includes(termo)) {
      score += pesoCampo;
    } else {
      return 0;
    }

    const ocorrencias = contarOcorrencias(texto, termo);

    if (ocorrencias > 1) {
      score += Math.min(ocorrencias - 1, 4) * (pesoCampo * 0.08);
    }

    return score * expansao.peso;
  }


  function detectarMediaIdExato(registro, consulta) {
    const idsRegistro = separarIds(registro.ID);
    const consultaNormalizada = normalizar(consulta);

    return idsRegistro.includes(consultaNormalizada);
  }


  function calcularRelevancia(registro, consulta) {
    const consultaNormalizada = normalizar(consulta);

    if (!consultaNormalizada) {
      return {
        score: 0,
        correspondencias: []
      };
    }

    if (detectarMediaIdExato(registro, consulta)) {
      return {
        score: 10000,
        correspondencias: [{
          campo: "ID",
          termo: consulta,
          tipo: "id-exato"
        }]
      };
    }

    const expansoes =
      typeof VocabularioJornalistico !== "undefined"
        ? VocabularioJornalistico.expandirConsulta(consulta)
        : [{
            termo: consultaNormalizada,
            original: consulta,
            tipo: "original",
            peso: 1
          }];

    let score = 0;
    const correspondencias = [];

    Object.entries(PESOS_CAMPOS).forEach(([campo, pesoCampo]) => {

      const valorCampo = registro[campo] || "";
      const valorNormalizado = normalizar(valorCampo);

      if (!valorNormalizado) return;

      expansoes.forEach((expansao) => {

        const pontos = calcularScoreCampo(
          valorCampo,
          expansao,
          pesoCampo
        );

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

    // Bônus caso a frase completa esteja na descrição.
    const descricao = normalizar(registro.DESCRICAO);

    if (
      consultaNormalizada.length >= 3 &&
      descricao.includes(consultaNormalizada)
    ) {
      score += 120;
    }

    // Bônus por todas as palavras originais estarem presentes.
    const palavrasOriginais = consultaNormalizada
      .split(" ")
      .filter((palavra) => palavra.length >= 2);

    if (palavrasOriginais.length > 1) {
      const textoCompleto = normalizar(
        Object.values(registro).join(" ")
      );

      const quantidadeEncontrada = palavrasOriginais.filter(
        (palavra) => textoCompleto.includes(palavra)
      ).length;

      if (quantidadeEncontrada === palavrasOriginais.length) {
        score += 60;
      } else {
        score += quantidadeEncontrada * 10;
      }
    }

    return {
      score,
      correspondencias
    };
  }


  function filtrarPrograma(registros, programa) {
    if (!programa) return registros;

    const programaNormalizado = normalizar(
      decodeURIComponent(programa)
    );

    return registros.filter((registro) =>
      normalizar(registro.PROGRAMA).includes(programaNormalizado)
    );
  }


  function pesquisar(registros, consulta, opcoes = {}) {
    const lista = Array.isArray(registros) ? registros : [];

    const base = filtrarPrograma(
      lista,
      opcoes.programa || ""
    );

    const termo = String(consulta || "").trim();

    // Sem busca: preserva a ordem original, atualmente por data.
    if (!termo) {
      return base;
    }

    return base
      .map((registro, indiceOriginal) => {

        const relevancia = calcularRelevancia(
          registro,
          termo
        );

        return {
          registro,
          indiceOriginal,
          score: relevancia.score,
          correspondencias: relevancia.correspondencias
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {

        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.indiceOriginal - b.indiceOriginal;
      })
      .map((item) => ({
        ...item.registro,

        // Metadados internos da busca.
        // Não aparecem na tabela.
        _SEARCH_SCORE: item.score,
        _SEARCH_MATCHES: item.correspondencias
      }));
  }


  function explicarResultado(registro) {
    return {
      score: registro._SEARCH_SCORE || 0,
      correspondencias: registro._SEARCH_MATCHES || []
    };
  }


  return {
    pesquisar,
    calcularRelevancia,
    explicarResultado,
    normalizar
  };

})();