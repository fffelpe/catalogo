// sinonimos.js
// Vocabulário jornalístico usado pela busca inteligente do Catálogo de Mídias.

const VocabularioJornalistico = (() => {

  const DICIONARIO = {
    agricultura: {
      sinonimos: [
        "agro",
        "agronegócio",
        "agronegocio",
        "lavoura",
        "plantação",
        "plantacao"
      ],
      relacionados: [
        "campo",
        "zona rural",
        "produtor rural",
        "produção rural",
        "producao rural",
        "safra",
        "colheita"
      ]
    },

    chuva: {
      sinonimos: [
        "precipitação",
        "precipitacao",
        "temporal",
        "garoa",
        "pancada de chuva"
      ],
      relacionados: [
        "alagamento",
        "enchente",
        "inundação",
        "inundacao",
        "defesa civil",
        "tempestade"
      ]
    },

    enchente: {
      sinonimos: [
        "alagamento",
        "inundação",
        "inundacao"
      ],
      relacionados: [
        "chuva",
        "temporal",
        "rio",
        "transbordamento",
        "defesa civil"
      ]
    },

    seca: {
      sinonimos: [
        "estiagem"
      ],
      relacionados: [
        "falta de água",
        "falta de agua",
        "crise hídrica",
        "crise hidrica",
        "reservatório",
        "reservatorio",
        "abastecimento",
        "agricultura"
      ]
    },

    economia: {
      sinonimos: [
        "econômico",
        "economico",
        "finanças",
        "financas"
      ],
      relacionados: [
        "inflação",
        "inflacao",
        "juros",
        "dólar",
        "dolar",
        "mercado",
        "preços",
        "precos",
        "consumo"
      ]
    },

    inflação: {
      sinonimos: [
        "inflacao",
        "alta de preços",
        "alta de precos"
      ],
      relacionados: [
        "economia",
        "supermercado",
        "alimentos",
        "cesta básica",
        "cesta basica",
        "preços",
        "precos",
        "consumidor"
      ]
    },

    desemprego: {
      sinonimos: [
        "desocupação",
        "desocupacao"
      ],
      relacionados: [
        "emprego",
        "trabalho",
        "mercado de trabalho",
        "vaga",
        "renda"
      ]
    },

    emprego: {
      sinonimos: [
        "trabalho",
        "ocupação",
        "ocupacao"
      ],
      relacionados: [
        "vaga",
        "contratação",
        "contratacao",
        "mercado de trabalho",
        "salário",
        "salario"
      ]
    },

    polícia: {
      sinonimos: [
        "policia",
        "policial"
      ],
      relacionados: [
        "viatura",
        "delegacia",
        "segurança pública",
        "seguranca publica",
        "investigação",
        "investigacao"
      ]
    },

    crime: {
      sinonimos: [
        "delito"
      ],
      relacionados: [
        "polícia",
        "policia",
        "delegacia",
        "investigação",
        "investigacao",
        "prisão",
        "prisao",
        "suspeito"
      ]
    },

    manifestação: {
      sinonimos: [
        "manifestacao",
        "protesto",
        "ato"
      ],
      relacionados: [
        "manifestantes",
        "passeata",
        "mobilização",
        "mobilizacao",
        "sindicato"
      ]
    },

    política: {
      sinonimos: [
        "politica"
      ],
      relacionados: [
        "governo",
        "congresso",
        "senado",
        "câmara",
        "camara",
        "deputado",
        "senador",
        "presidente"
      ]
    },

    governo: {
      sinonimos: [
        "administração pública",
        "administracao publica"
      ],
      relacionados: [
        "presidente",
        "ministro",
        "palácio do planalto",
        "palacio do planalto",
        "brasília",
        "brasilia",
        "política",
        "politica"
      ]
    },

    congresso: {
      sinonimos: [
        "congresso nacional"
      ],
      relacionados: [
        "câmara",
        "camara",
        "senado",
        "deputado",
        "senador",
        "brasília",
        "brasilia"
      ]
    },

    saúde: {
      sinonimos: [
        "saude"
      ],
      relacionados: [
        "hospital",
        "médico",
        "medico",
        "paciente",
        "enfermagem",
        "atendimento",
        "sus"
      ]
    },

    hospital: {
      sinonimos: [
        "unidade hospitalar"
      ],
      relacionados: [
        "saúde",
        "saude",
        "médico",
        "medico",
        "paciente",
        "enfermagem",
        "pronto-socorro"
      ]
    },

    trânsito: {
      sinonimos: [
        "transito",
        "tráfego",
        "trafego"
      ],
      relacionados: [
        "carro",
        "veículo",
        "veiculo",
        "congestionamento",
        "avenida",
        "rodovia",
        "estrada"
      ]
    },

    carro: {
      sinonimos: [
        "automóvel",
        "automovel",
        "veículo",
        "veiculo"
      ],
      relacionados: [
        "trânsito",
        "transito",
        "estrada",
        "rodovia",
        "avenida"
      ]
    },

    acidente: {
      sinonimos: [
        "ocorrência",
        "ocorrencia"
      ],
      relacionados: [
        "trânsito",
        "transito",
        "rodovia",
        "estrada",
        "ambulância",
        "ambulancia",
        "bombeiros"
      ]
    },

    incêndio: {
      sinonimos: [
        "incendio",
        "fogo"
      ],
      relacionados: [
        "bombeiros",
        "fumaça",
        "fumaca",
        "queimada",
        "emergência",
        "emergencia"
      ]
    },

    meio_ambiente: {
      termos: [
        "meio ambiente"
      ],
      sinonimos: [
        "ambiental"
      ],
      relacionados: [
        "natureza",
        "floresta",
        "desmatamento",
        "preservação",
        "preservacao",
        "sustentabilidade",
        "biodiversidade"
      ]
    },

    desmatamento: {
      sinonimos: [
        "desflorestamento"
      ],
      relacionados: [
        "floresta",
        "amazônia",
        "amazonia",
        "meio ambiente",
        "queimada",
        "preservação",
        "preservacao"
      ]
    },

    pecuária: {
      sinonimos: [
        "pecuaria",
        "criação de gado",
        "criacao de gado"
      ],
      relacionados: [
        "gado",
        "boi",
        "vaca",
        "fazenda",
        "pastagem",
        "produtor rural",
        "agronegócio",
        "agronegocio"
      ]
    },

    café: {
      sinonimos: [
        "cafe",
        "cafeicultura"
      ],
      relacionados: [
        "lavoura",
        "colheita",
        "agricultura",
        "grão",
        "grao",
        "produtor rural"
      ]
    },

    soja: {
      sinonimos: [
        "sojicultura"
      ],
      relacionados: [
        "grãos",
        "graos",
        "lavoura",
        "colheita",
        "safra",
        "agronegócio",
        "agronegocio"
      ]
    },

    milho: {
      sinonimos: [
        "milhocultura"
      ],
      relacionados: [
        "grãos",
        "graos",
        "lavoura",
        "safra",
        "colheita",
        "agricultura"
      ]
    },

    colheita: {
      sinonimos: [
        "colhimento"
      ],
      relacionados: [
        "safra",
        "lavoura",
        "agricultura",
        "máquina agrícola",
        "maquina agricola",
        "trator"
      ]
    },

    tecnologia: {
      sinonimos: [
        "tecnológico",
        "tecnologico"
      ],
      relacionados: [
        "internet",
        "computador",
        "inteligência artificial",
        "inteligencia artificial",
        "inovação",
        "inovacao",
        "digital"
      ]
    },

    educação: {
      sinonimos: [
        "educacao",
        "ensino"
      ],
      relacionados: [
        "escola",
        "professor",
        "aluno",
        "universidade",
        "faculdade",
        "estudante"
      ]
    },

    esporte: {
      sinonimos: [
        "esportes",
        "esportivo"
      ],
      relacionados: [
        "futebol",
        "atleta",
        "jogo",
        "campeonato",
        "estádio",
        "estadio"
      ]
    },

    covid_19: {
      termos: ["covid-19"],
      sinonimos: ["covid", "coronavírus", "coronavirus", "sars-cov-2"],
      relacionados: ["pandemia", "vacina", "hospital", "saúde", "isolamento"],
      categoria: "assunto"
    },

    supremo_tribunal_federal: {
      termos: ["supremo tribunal federal"],
      sinonimos: ["stf", "supremo"],
      relacionados: ["justiça", "tribunal", "ministro", "brasília"],
      categoria: "organizacao"
    },

    policia_federal: {
      termos: ["polícia federal"],
      sinonimos: ["policia federal", "pf"],
      relacionados: ["investigação", "operação", "delegado", "prisão"],
      categoria: "organizacao"
    },

    petrobras: {
      termos: ["petrobras"],
      sinonimos: ["petróleo brasileiro s.a.", "petroleo brasileiro s.a."],
      relacionados: ["petróleo", "petroleo", "combustível", "combustivel", "energia"],
      categoria: "organizacao"
    },

    banco_central: {
      termos: ["banco central"],
      sinonimos: ["bacen", "bc"],
      relacionados: ["juros", "selic", "inflação", "inflacao", "economia"],
      categoria: "organizacao"
    },

    ibama: {
      termos: ["ibama"],
      sinonimos: ["instituto brasileiro do meio ambiente"],
      relacionados: ["meio ambiente", "fiscalização", "fiscalizacao", "desmatamento"],
      categoria: "organizacao"
    },

    inss: {
      termos: ["inss"],
      sinonimos: ["instituto nacional do seguro social"],
      relacionados: ["previdência", "previdencia", "aposentadoria", "benefício", "beneficio"],
      categoria: "organizacao"
    },

    defesa_civil: {
      termos: ["defesa civil"],
      sinonimos: [],
      relacionados: ["enchente", "alagamento", "chuva", "deslizamento", "emergência", "emergencia"],
      categoria: "organizacao"
    }
  };


  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function escaparRegex(texto) {
    return String(texto || "").replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  function contemExpressao(textoNormalizado, expressaoNormalizada) {
    if (!textoNormalizado || !expressaoNormalizada) return false;
    const padrao = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaparRegex(expressaoNormalizada)}(?=$|[^\\p{L}\\p{N}])`,
      "u"
    );
    return padrao.test(textoNormalizado);
  }

  function obterNomeGrupo(chave, grupo) {
    if (grupo.termos && grupo.termos.length) {
      return grupo.termos[0];
    }

    return chave.replace(/_/g, " ");
  }


  function encontrarGrupo(termo) {
    const consulta = normalizar(termo);

    for (const [chave, grupo] of Object.entries(DICIONARIO)) {

      const principal = normalizar(obterNomeGrupo(chave, grupo));

      const alternativas = [
        principal,
        ...(grupo.termos || []).map(normalizar),
        ...(grupo.sinonimos || []).map(normalizar)
      ];

      if (alternativas.includes(consulta)) {
        return {
          chave,
          principal: obterNomeGrupo(chave, grupo),
          ...grupo
        };
      }
    }

    return null;
  }


  function expandirTermo(termo) {
    const grupo = encontrarGrupo(termo);

    if (!grupo) {
      return [{
        termo: normalizar(termo),
        original: termo,
        tipo: "original",
        peso: 1
      }];
    }

    const resultados = new Map();

    function adicionar(valor, tipo, peso) {
      const normalizado = normalizar(valor);

      if (!normalizado) return;

      const existente = resultados.get(normalizado);

      if (!existente || peso > existente.peso) {
        resultados.set(normalizado, {
          termo: normalizado,
          original: valor,
          tipo,
          peso
        });
      }
    }

    adicionar(termo, "original", 1);
    adicionar(grupo.principal, "principal", 0.95);

    (grupo.sinonimos || []).forEach((item) => {
      adicionar(item, "sinonimo", 0.65);
    });

    (grupo.relacionados || []).forEach((item) => {
      adicionar(item, "relacionado", 0.3);
    });

    return [...resultados.values()];
  }


  function expandirConsulta(consulta) {
    const consultaNormalizada = normalizar(consulta);

    if (!consultaNormalizada) return [];

    const resultado = new Map();

    function adicionar(item) {
      const existente = resultado.get(item.termo);

      if (!existente || item.peso > existente.peso) {
        resultado.set(item.termo, item);
      }
    }

    // Mantém a frase completa com o maior peso.
    adicionar({
      termo: consultaNormalizada,
      original: consulta,
      tipo: "frase",
      peso: 1
    });

    // Expande cada palavra individualmente.
    consultaNormalizada
      .split(" ")
      .filter((item) => item.length >= 2)
      .forEach((palavra) => {
        expandirTermo(palavra).forEach(adicionar);
      });

    // Também verifica qualquer forma composta cadastrada (principal, termo ou sinônimo)
    // usando limites de palavra para evitar falsos positivos como "banco centralizado".
    Object.entries(DICIONARIO).forEach(([chave, grupo]) => {
      const principal = obterNomeGrupo(chave, grupo);
      const compostos = aliasesDoGrupo(chave, grupo, false)
        .filter((alias) => alias.includes(" "));

      if (compostos.some((alias) => contemExpressao(consultaNormalizada, alias))) {
        expandirTermo(principal).forEach(adicionar);
      }
    });

    return [...resultado.values()];
  }


  function listarTodos() {
    return Object.entries(DICIONARIO).map(([chave, grupo]) => ({
      chave,
      termo: obterNomeGrupo(chave, grupo),
      sinonimos: grupo.sinonimos || [],
      relacionados: grupo.relacionados || [],
      categoria: grupo.categoria || "assunto"
    }));
  }

  function aliasesDoGrupo(chave, grupo, incluirRelacionados = false) {
    const valores = [
      obterNomeGrupo(chave, grupo),
      ...(grupo.termos || []),
      ...(grupo.sinonimos || [])
    ];
    if (incluirRelacionados) valores.push(...(grupo.relacionados || []));
    return [...new Set(valores.map(normalizar).filter(Boolean))];
  }

  let indiceConceitosCache = null;

  function obterIndiceConceitos() {
    if (indiceConceitosCache) return indiceConceitosCache;

    indiceConceitosCache = Object.entries(DICIONARIO).map(([chave, grupo]) => ({
      chave,
      termo: obterNomeGrupo(chave, grupo),
      categoria: grupo.categoria || "assunto",
      aliases: aliasesDoGrupo(chave, grupo, false),
      relacionados: (grupo.relacionados || []).map(normalizar).filter(Boolean)
    }));

    return indiceConceitosCache;
  }

  function canonizar(termo) {
    const grupo = encontrarGrupo(termo);
    return grupo ? grupo.principal : String(termo || "").trim();
  }

  function extrairConceitos(texto, opcoes = {}) {
    const normalizado = normalizar(texto);
    if (!normalizado) return [];
    const resultados = [];

    for (const conceito of obterIndiceConceitos()) {
      let peso = 0;
      let evidencia = "";

      for (const alias of conceito.aliases) {
        if (contemExpressao(normalizado, alias)) {
          peso = 1;
          evidencia = alias;
          break;
        }
      }

      if (!peso && opcoes.incluirRelacionados !== false) {
        for (const relacionado of conceito.relacionados) {
          if (contemExpressao(normalizado, relacionado)) {
            peso = 0.45;
            evidencia = relacionado;
            break;
          }
        }
      }

      if (peso) {
        resultados.push({
          chave: conceito.chave,
          termo: conceito.termo,
          categoria: conceito.categoria,
          peso,
          evidencia
        });
      }
    }

    return resultados;
  }

  function termosCanonicos() {
    return listarTodos().map((item) => ({
      chave: item.chave,
      termo: item.termo,
      categoria: item.categoria
    }));
  }


  return {
    DICIONARIO,
    normalizar,
    encontrarGrupo,
    expandirTermo,
    expandirConsulta,
    listarTodos,
    canonizar,
    extrairConceitos,
    termosCanonicos
  };

})();