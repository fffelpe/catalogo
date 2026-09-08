// reporteres.js - Identifica repórteres a partir da planilha, dos créditos e do cadastro auxiliar.
// Prioridade: valor já informado na planilha > crédito explícito > nome conhecido presente nos créditos.

const ReporteresMedia = (() => {
  let nomesConhecidos = [];
  let cadastroCarregado = false;
  let preparacaoPromise = null;

  const URL_CADASTRO = (() => {
    try {
      const base = document.currentScript?.src || window.location.href;
      return new URL("../data/reporteres.json", base).href;
    } catch {
      return "../data/reporteres.json";
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
    if (cadastroCarregado) return nomesConhecidos;

    try {
      const resposta = await fetch(`${URL_CADASTRO}${URL_CADASTRO.includes("?") ? "&" : "?"}_=${Date.now()}`, {
        cache: "no-store"
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

      const dados = await resposta.json();
      nomesConhecidos = Array.isArray(dados?.reporteres)
        ? dados.reporteres.map((item) => String(item?.nome || "").trim()).filter(Boolean)
        : [];
      cadastroCarregado = true;
    } catch (erro) {
      console.warn("Cadastro auxiliar de repórteres indisponível:", erro);
      nomesConhecidos = [];
      cadastroCarregado = true;
    }

    return nomesConhecidos;
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

    // Alguns registros trazem o crédito diretamente na descrição da planilha.
    const descricao = String(registro.DESCRICAO || "");
    if (/REP[ÓO]RTER|REPORTAGEM|TRAZ\s+TODOS\s+OS\s+DETALHES|FOI\s+CONFERIR/i.test(descricao)) {
      extrairDoTexto(descricao).forEach((nome) => adicionar(encontrados, nome));
    }

    return encontrados.join(" / ");
  }

  function aplicar(registros) {
    if (!Array.isArray(registros)) return registros;

    registros.forEach((registro) => {
      if (!registro || typeof registro !== "object") return;
      const original = String(registro.REPORTER || "").trim();
      const identificado = identificar(registro);
      if (!identificado) return;

      registro.REPORTER = identificado;
      registro._REPORTER_ORIGEM = original ? "planilha" : "creditos";
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

// Integração transparente: qualquer página que carregue a planilha depois deste script
// recebe os repórteres enriquecidos antes de usar os registros.
if (typeof DadosMedia !== "undefined" && typeof DadosMedia.carregarCSV === "function") {
  const carregarCSVOriginal = DadosMedia.carregarCSV.bind(DadosMedia);

  DadosMedia.carregarCSV = async function (...args) {
    const registros = await carregarCSVOriginal(...args);

    try {
      await ReporteresMedia.preparar();
      ReporteresMedia.aplicar(this.registros);
    } catch (erro) {
      console.warn("Não foi possível enriquecer os repórteres nesta execução:", erro);
    }

    return registros;
  };
}
