const MediaIdUtils = (() => {
  const EXATO = /^\d{4}[A-Z]\d{5,6}$/i;
  const NO_TEXTO = /(?<![A-Z0-9])\d{4}[A-Z]\d{5,6}(?![A-Z0-9])/gi;

  function normalizar(valor) {
    const limpo = String(valor ?? "")
      .replace(/\.mp4$/i, "")
      .replace(/[\u00A0\u200B-\u200D\uFEFF\s]+/g, "")
      .trim()
      .toUpperCase();
    return EXATO.test(limpo) ? limpo : "";
  }

  function extrair(valor) {
    const texto = String(valor ?? "").toUpperCase();
    const encontrados = texto.match(NO_TEXTO) || [];
    const ids = [];
    const vistos = new Set();

    encontrados.forEach((item) => {
      const id = normalizar(item);
      if (id && !vistos.has(id)) {
        vistos.add(id);
        ids.push(id);
      }
    });

    if (!ids.length) {
      const exato = normalizar(texto);
      if (exato) ids.push(exato);
    }

    return ids;
  }

  return { normalizar, extrair, EXATO };
})();
