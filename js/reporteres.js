// reporteres.js - Identifica repórteres e enriquece afiliadas a partir da base oficial.
// Prioridade: valor já informado em imgs > créditos > cadastro oficial de referência.

const ReporteresMedia = (() => {
  let nomesConhecidos = [];
  let cadastro = { afiliadas: [], reporteres: [] };
  let cadastroCarregado = false;
  let preparacaoPromise = null;

  const URL_CADASTRO = (() => {
    try {
      const base = document.currentScript?.src || window.location.href;
      return new URL("../data/afiliadas-reporteres.json", base).href;
    } catch {
      return "../data/afiliadas-reporteres.json";
    }
  })();

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleUpperCase("pt-BR")
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function limparNome(valor) {
    return String(valor || "")
      .replace(/^\s*(?:REP[ÓO]RTER(?:A)?|REPORTAGEM)\s*[:\-–—]\s*/i, "")
      .replace(/\s*(?:\||\/\/|\.\.\.).*$/g, "")
      .replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pareceNome(valor) {
    const nome = limparNome(valor);
    if (!nome || /\d/.test(nome)) return false;

    const partes = nome.split(/\s+/).filter(Boolean);
    if (partes.length < 2 || partes.length > 6) return false;

    const texto = normalizar(nome);
    if (/\b(?:REPORTAGEM|REPORTER|IMAGENS|CINEGRAFIA|CINEGRAFISTA|CAMERA|EDICAO|EDITOR|PRODUCAO|ROTEIRO|VOLTA|SEM GC|MATERIA|ENTREVISTA|SONORA|APRESENTADOR|APRESENTADORA)\b/.test(texto)) {
      return false;
    }

    return partes.every((parte) => /^[\p{L}'’.-]+$/u.test(parte));
  }

  function adicionar(lista, valor) {
    const nome = limparNome(valor);
    if (!pareceNome(nome)) return;

    const chave = normalizar(nome);
    if (lista.some((item) => normalizar(item) === chave)) return;
    lista.push(nome);
  }

  function extrairDoTexto(texto) {
    const encontrados = [];
    const original = String(texto || "");
    if (!original.trim()) return encontrados;

    const padroes = [
      /(?:^|\|\s*)([\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){1,5})\s*[-–—:]\s*REP[ÓO]RTER(?:A)?\b/giu,
      /\bREP[ÓO]RTER(?:A)?\s*[:\-–—]\s*([\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){1,5})/giu,
      /\b(?:A\s+)?REPORTAGEM\s+(?:É|E)\s+(?:DA|DO|DE)\s+([\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){1,5})/giu,
      /\bREPORTAGEM\s+(?:DE|DA|DO)\s+([\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){1,5})/giu,
      /(?:^|[.!?\/]|\|\s*)\s*([\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){1,4})\s+(?:TRAZ\s+TODOS\s+OS\s+DETALHES|FOI\s+CONFERIR)\b/giu
    ];

    padroes.forEach((padrao) => {
      for (const match of original.matchAll(padrao)) adicionar(encontrados, match[1]);
    });

    return encontrados;
  }

  async function carregarCadastro() {
    if (cadastroCarregado) return cadastro;

    try {
      const resposta = await fetch(`${URL_CADASTRO}${URL_CADASTRO.includes("?") ? "&" : "?"}_=${Date.now()}`, {
        cache: "no-store"
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

      const dados = await resposta.json();
      if (dados?.schemaVersion !== 1) throw new Error("Versão do cadastro não reconhecida.");

      cadastro = {
        afiliadas: Array.isArray(dados.afiliadas) ? dados.afiliadas : [],
        reporteres: Array.isArray(dados.reporteres) ? dados.reporteres : []
      };
      nomesConhecidos = cadastro.reporteres
        .map((item) => String(item?.nome || "").trim())
        .filter(Boolean);
      cadastroCarregado = true;
    } catch (erro) {
      console.warn("Cadastro oficial de afiliadas/repórteres indisponível:", erro);
      cadastro = { afiliadas: [], reporteres: [] };
      nomesConhecidos = [];
      cadastroCarregado = true;
    }

    return cadastro;
  }

  function buscarReporterPorNome(nome) {
    const chave = normalizar(nome);
    if (!chave) return null;
    return cadastro.reporteres.find((item) => normalizar(item?.nome) === chave) || null;
  }

  function buscarAfiliadaPorId(id) {
    const chave = normalizar(id);
    if (!chave) return null;
    return cadastro.afiliadas.find((item) => normalizar(item?.id) === chave) || null;
  }

  function buscarAfiliadaPorNome(nome) {
    const chave = normalizar(nome);
    if (!chave) return null;
    return cadastro.afiliadas.find((item) => normalizar(item?.nome) === chave) || null;
  }

  function montarTextoCreditos(dados) {
    if (!dados || typeof dados !== "object") return "";

    const partes = [dados.textoCompleto, dados.materia];

    if (Array.isArray(dados.fontes)) {
      dados.fontes.forEach((fonte) => {
        partes.push(fonte?.nome, fonte?.cargo);
      });
    }

    Object.values(dados.creditos || {}).forEach((valor) => {
      if (Array.isArray(valor)) partes.push(...valor);
      else partes.push(valor);
    });

    return partes.filter(Boolean).join(" | ");
  }

  function identificar(registro) {
    if (!registro || typeof registro !== "object") return "";

    const encontrados = [];

    String(registro.REPORTER || "")
      .split(/[\r\n,;+|]+/)
      .map((nome) => nome.trim())
      .filter(Boolean)
      .forEach((nome) => adicionar(encontrados, nome));

    if (typeof CreditosMedia !== "undefined" && typeof CreditosMedia.obterPorValorIds === "function") {
      CreditosMedia.obterPorValorIds(registro.ID).forEach(({ dados }) => {
        const estruturados = Array.isArray(dados.reporteres)
          ? dados.reporteres
          : (dados.reporter ? [dados.reporter] : []);
        estruturados.forEach((nome) => adicionar(encontrados, nome));

        const reportagem = dados.creditos?.reportagem;
        (Array.isArray(reportagem) ? reportagem : [reportagem])
          .filter(Boolean)
          .forEach((nome) => adicionar(encontrados, nome));

        const textoCreditos = montarTextoCreditos(dados);
        extrairDoTexto(textoCreditos).forEach((nome) => adicionar(encontrados, nome));

        const textoNormalizado = normalizar(textoCreditos);
        nomesConhecidos.forEach((nome) => {
          const nomeNormalizado = normalizar(nome);
          if (nomeNormalizado && textoNormalizado.includes(nomeNormalizado)) adicionar(encontrados, nome);
        });
      });
    }

    const descricao = String(registro.DESCRICAO || "");
    if (/REP[ÓO]RTER|REPORTAGEM|TRAZ\s+TODOS\s+OS\s+DETALHES|FOI\s+CONFERIR/i.test(descricao)) {
      extrairDoTexto(descricao).forEach((nome) => adicionar(encontrados, nome));
    }

    return encontrados.join(" / ");
  }

  function aplicarMetadadosAfiliada(registro, afiliada, preencherNome = false) {
    if (!registro || !afiliada) return;

    if (preencherNome && !String(registro.AFILIADA_EMISSORA || "").trim()) {
      registro.AFILIADA_EMISSORA = String(afiliada.nome || "").trim();
    }

    registro._AFILIADA_ID = String(afiliada.id || "").trim();
    registro._AFILIADA_UF = String(afiliada.uf || "").trim();
    registro._AFILIADA_CIDADE = String(afiliada.cidade || "").trim();
    registro._AFILIADA_ATIVA = afiliada.ativa !== false;
    registro._ENRIQUECIMENTO_ORIGEM = "fonte_afiliadas_reporteres";
  }

  function aplicarMetadadosReporter(registro, nomes) {
    const conhecidos = nomes
      .map((nome) => buscarReporterPorNome(nome))
      .filter(Boolean);

    if (!conhecidos.length) return conhecidos;

    registro._REPORTER_ID = conhecidos.map((item) => item.id).filter(Boolean).join(" / ");
    registro._REPORTER_ATIVO = conhecidos.every((item) => item.ativo !== false);
    return conhecidos;
  }

  function resolverAfiliadaUnicaPorReporteres(reporteres) {
    const ids = [...new Set(
      reporteres.map((item) => String(item?.afiliadaId || "").trim()).filter(Boolean)
    )];
    if (ids.length !== 1) return null;
    return buscarAfiliadaPorId(ids[0]);
  }

  function aplicar(registros) {
    if (!Array.isArray(registros)) return registros;

    registros.forEach((registro) => {
      if (!registro || typeof registro !== "object") return;

      const reporterOriginal = String(registro.REPORTER || "").trim();
      const afiliadaOriginal = String(registro.AFILIADA_EMISSORA || "").trim();
      const identificado = identificar(registro);
      const nomesIdentificados = identificado
        ? identificado.split(/\s+\/\s+/).map((nome) => nome.trim()).filter(Boolean)
        : [];

      if (identificado) {
        registro.REPORTER = identificado;
        registro._REPORTER_ORIGEM = reporterOriginal ? "planilha" : "creditos";
      }

      const reporteresConhecidos = aplicarMetadadosReporter(registro, nomesIdentificados);

      if (afiliadaOriginal) {
        const afiliadaCadastrada = buscarAfiliadaPorNome(afiliadaOriginal);
        if (afiliadaCadastrada) aplicarMetadadosAfiliada(registro, afiliadaCadastrada, false);
        return;
      }

      const afiliadaInferida = resolverAfiliadaUnicaPorReporteres(reporteresConhecidos);
      if (afiliadaInferida) aplicarMetadadosAfiliada(registro, afiliadaInferida, true);
    });

    return registros;
  }

  async function preparar() {
    if (preparacaoPromise) return preparacaoPromise;

    preparacaoPromise = (async () => {
      const tarefas = [carregarCadastro()];
      if (typeof CreditosMedia !== "undefined" && typeof CreditosMedia.carregar === "function") {
        tarefas.push(CreditosMedia.carregar());
      }
      await Promise.all(tarefas);
      return true;
    })();

    try {
      return await preparacaoPromise;
    } finally {
      preparacaoPromise = null;
    }
  }

  return { carregarCadastro, identificar, aplicar, preparar };
})();

// Integração transparente: qualquer página que carregue o acervo depois deste script
// recebe o enriquecimento antes de usar os registros.
if (typeof DadosMedia !== "undefined" && typeof DadosMedia.carregarCSV === "function") {
  const carregarCSVOriginal = DadosMedia.carregarCSV.bind(DadosMedia);

  DadosMedia.carregarCSV = async function (...args) {
    const registros = await carregarCSVOriginal(...args);

    try {
      await ReporteresMedia.preparar();
      ReporteresMedia.aplicar(this.registros);
    } catch (erro) {
      console.warn("Não foi possível enriquecer repórteres e afiliadas nesta execução:", erro);
    }

    return registros;
  };
}
