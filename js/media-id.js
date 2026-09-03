const MediaIdUtils = (() => {
  const EXATO = /^\d{4}[A-Z]\d{5,6}$/i;
  const NO_TEXTO = /(?:^|[^A-Z0-9])(\d{4}[A-Z]\d{5,6})(?=$|[^0-9])/gi;

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
    const ids = [];
    const vistos = new Set();

    for (const match of texto.matchAll(NO_TEXTO)) {
      const id = normalizar(match[1]);
      if (id && !vistos.has(id)) {
        vistos.add(id);
        ids.push(id);
      }
    }

    if (!ids.length) {
      const exato = normalizar(texto);
      if (exato) ids.push(exato);
    }

    return ids;
  }

  return { normalizar, extrair, EXATO };
})();
