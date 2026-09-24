// related-media.js - Similaridade determinística entre registros do catálogo.

const RelatedMedia = (() => {
  const STOPWORDS = new Set([
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no",
    "nas", "nos", "um", "uma", "uns", "umas", "para", "por", "com", "sem", "que"
  ]);

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(texto) {
    return new Set(
      normalizar(texto)
        .split(" ")
        .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
    );
  }

  function idsRegistro(registro) {
    if (typeof MediaIdUtils === "undefined") return [];
    return MediaIdUtils.extrair(registro?.ID || "");
  }

  function conjuntoNormalizado(lista) {
    return new Set((Array.isArray(lista) ? lista : []).map(normalizar).filter(Boolean));
  }

  function intersecaoTamanho(a, b) {
    let total = 0;
    a.forEach((valor) => {
      if (b.has(valor)) total++;
    });
    return total;
  }

  function metadadosEnriquecidos(registro) {
    const subjects = new Set();
    const keywords = new Set();
    const places = new Set();

    if (typeof MediaEnrichment === "undefined") return { subjects, keywords, places };

    idsRegistro(registro).forEach((id) => {
      const item = MediaEnrichment.obter(id);
      if (!item) return;
      conjuntoNormalizado(item.subjects).forEach((valor) => subjects.add(valor));
      conjuntoNormalizado(item.keywords).forEach((valor) => keywords.add(valor));
      conjuntoNormalizado(item.places).forEach((valor) => places.add(valor));
    });

    return { subjects, keywords, places };
  }

  function parseData(valor) {
    const str = String(valor || "").trim();
    let match = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (match) {
      let [, d, m, y] = match;
      if (y.length === 2) y = (Number(y) < 50 ? "20" : "19") + y;
      const data = new Date(Number(y), Number(m) - 1, Number(d));
      if (data.getFullYear() === Number(y) && data.getMonth() === Number(m) - 1 && data.getDate() === Number(d)) return data;
      return null;
    }

    match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!match) return null;
    const [, y, m, d] = match;
    const data = new Date(Number(y), Number(m) - 1, Number(d));
    return data.getFullYear() === Number(y) && data.getMonth() === Number(m) - 1 && data.getDate() === Number(d)
      ? data
      : null;
  }

  function bonusTemporal(dataA, dataB) {
    const a = parseData(dataA);
    const b = parseData(dataB);
    if (!a || !b) return 0;
    const dias = Math.abs(a - b) / 86400000;
    if (dias <= 7) return 5;
    if (dias <= 30) return 4;
    if (dias <= 90) return 3;
    if (dias <= 365) return 1;
    return 0;
  }

  function descricaoScore(a, b) {
    const ta = tokens(a);
    const tb = tokens(b);
    if (!ta.size || !tb.size) return 0;
    const comum = intersecaoTamanho(ta, tb);
    const uniao = new Set([...ta, ...tb]).size;
    return uniao ? (comum / uniao) * 25 : 0;
  }

  function calcularScore(atual, candidato) {
    const metaAtual = metadadosEnriquecidos(atual);
    const metaCandidato = metadadosEnriquecidos(candidato);
    let score = 0;
    const motivos = [];

    if (intersecaoTamanho(metaAtual.subjects, metaCandidato.subjects) > 0) {
      score += 35;
      motivos.push("assunto");
    }
    if (intersecaoTamanho(metaAtual.keywords, metaCandidato.keywords) > 0) {
      score += 30;
      motivos.push("palavra-chave");
    }

    const pontosDescricao = descricaoScore(atual.DESCRICAO, candidato.DESCRICAO);
    if (pontosDescricao > 0) {
      score += pontosDescricao;
      motivos.push("descrição");
    }

    const localAtual = normalizar(atual.LOCAL);
    const localCandidato = normalizar(candidato.LOCAL);
    const lugaresRelacionados = intersecaoTamanho(metaAtual.places, metaCandidato.places) > 0;
    if ((localAtual && localAtual === localCandidato) || lugaresRelacionados) {
      score += 18;
      motivos.push("local");
    }

    if (normalizar(atual.EDITORIA) && normalizar(atual.EDITORIA) === normalizar(candidato.EDITORIA)) score += 12;
    if (normalizar(atual.REPORTER) && normalizar(atual.REPORTER) === normalizar(candidato.REPORTER)) score += 10;
    if (normalizar(atual.PROGRAMA) && normalizar(atual.PROGRAMA) === normalizar(candidato.PROGRAMA)) score += 6;
    score += bonusTemporal(atual.DATA, candidato.DATA);

    return { score, motivos };
  }

  function calcular(registroAtual, registros, opcoes = {}) {
    const lista = Array.isArray(registros) ? registros : [];
    const idsAtuais = new Set(idsRegistro(registroAtual));
    const idSolicitado = typeof MediaIdUtils !== "undefined" ? MediaIdUtils.normalizar(opcoes.mediaId) : "";
    if (idSolicitado) idsAtuais.add(idSolicitado);

    const limite = Number.isInteger(opcoes.limite) && opcoes.limite > 0 ? opcoes.limite : 6;
    const scoreMinimo = Number.isFinite(Number(opcoes.scoreMinimo)) ? Number(opcoes.scoreMinimo) : 12;
    const vistos = new Set();

    return lista
      .map((registro, indiceOriginal) => {
        const ids = idsRegistro(registro);
        if (!ids.length || ids.some((id) => idsAtuais.has(id))) return null;

        const chave = [...ids].sort().join("|");
        if (vistos.has(chave)) return null;
        vistos.add(chave);

        const relevancia = calcularScore(registroAtual, registro);
        return { registro, score: relevancia.score, motivos: relevancia.motivos, indiceOriginal };
      })
      .filter((item) => item && item.score >= scoreMinimo)
      .sort((a, b) => b.score - a.score || a.indiceOriginal - b.indiceOriginal)
      .slice(0, limite)
      .map(({ indiceOriginal, ...item }) => item);
  }

  return { calcular };
})();
