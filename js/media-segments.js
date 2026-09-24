// media-segments.js - Busca textual em segmentos/timecodes do Media ID.

const MediaSegments = (() => {
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

  function extrairTermos(consulta) {
    return normalizar(consulta)
      .split(" ")
      .filter((termo) => termo.length >= 2 && !STOPWORDS.has(termo));
  }

  function pontuarTexto(texto, consulta) {
    const alvo = normalizar(texto);
    const frase = normalizar(consulta);
    if (!alvo || !frase) return 0;

    let score = 0;
    if (alvo.includes(frase)) score += 100;

    const termos = extrairTermos(consulta);
    if (!termos.length) return score;

    const encontrados = termos.filter((termo) => alvo.includes(termo)).length;
    if (!encontrados) return 0;

    score += encontrados * 20;
    if (encontrados === termos.length) score += 40;
    return score;
  }

  function buscar(mediaId, consulta) {
    if (
      typeof MediaIdUtils === "undefined" ||
      typeof MediaEnrichment === "undefined" ||
      typeof MediaEnrichment.obterSegmentos !== "function"
    ) return [];

    const id = MediaIdUtils.normalizar(mediaId);
    if (!id) return [];

    return MediaEnrichment.obterSegmentos(id)
      .map((segmento, indiceOriginal) => ({
        mediaId: id,
        start: Number(segmento.start),
        ...(segmento.end === undefined ? {} : { end: Number(segmento.end) }),
        text: String(segmento.text || ""),
        score: pontuarTexto(segmento.text, consulta),
        indiceOriginal
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.indiceOriginal - b.indiceOriginal)
      .map(({ indiceOriginal, ...item }) => item);
  }

  function buscarEmRegistro(registro, consulta) {
    if (typeof MediaIdUtils === "undefined") return [];
    const ids = MediaIdUtils.extrair(registro?.ID || "");
    return ids
      .flatMap((id) => buscar(id, consulta))
      .sort((a, b) => b.score - a.score || a.start - b.start);
  }

  function formatarTimecode(segundos) {
    const total = Number(segundos);
    if (!Number.isFinite(total) || total < 0) return "00:00";
    const arredondado = Math.floor(total);
    const horas = Math.floor(arredondado / 3600);
    const minutos = Math.floor((arredondado % 3600) / 60);
    const secs = arredondado % 60;
    const dois = (valor) => String(valor).padStart(2, "0");
    return horas > 0
      ? `${dois(horas)}:${dois(minutos)}:${dois(secs)}`
      : `${dois(minutos)}:${dois(secs)}`;
  }

  function criarUrlFicha(mediaId, start = 0) {
    if (typeof MediaIdUtils === "undefined") return "";
    const id = MediaIdUtils.normalizar(mediaId);
    if (!id) return "";

    const segundos = Number(start);
    const params = new URLSearchParams({ id });
    if (Number.isFinite(segundos) && segundos > 0) {
      params.set("t", String(Math.floor(segundos)));
    }
    return `media.html?${params.toString()}`;
  }

  return {
    buscar,
    buscarEmRegistro,
    formatarTimecode,
    criarUrlFicha
  };
})();
