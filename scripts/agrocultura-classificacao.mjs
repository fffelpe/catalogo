import { extrairMediaIds } from "./media-id.mjs";

/**
 * Um card representa um Media ID. Uma célula com vários IDs gera vários cards,
 * sempre conservando os metadados da linha de origem.
 */
export function desmembrarPorMediaId(registros = []) {
  return registros.flatMap((registro) => {
    const bruto = Array.isArray(registro.ids) && registro.ids.length
      ? registro.ids.join("\n")
      : registro.id;
    return extrairMediaIds(bruto).map((id) => ({
      ...registro,
      id,
      ids: [id],
    }));
  });
}

/** Deduplica dentro de uma categoria, preenchendo apenas campos ausentes. */
export function consolidarPorMediaId(registros = []) {
  const unicos = new Map();

  for (const registro of desmembrarPorMediaId(registros)) {
    const anterior = unicos.get(registro.id);
    if (!anterior) {
      unicos.set(registro.id, { ...registro });
      continue;
    }

    for (const campo of ["descricao", "reporter", "data", "local", "pgm", "afiliada"]) {
      if (!String(anterior[campo] ?? "").trim() && String(registro[campo] ?? "").trim()) {
        anterior[campo] = registro[campo];
      }
    }
    if (!anterior._timestamp && registro._timestamp) {
      anterior._timestamp = registro._timestamp;
    }
  }

  return [...unicos.values()];
}

/**
 * VT e notícia permanecem nas respectivas abas mesmo se repetidos entre si.
 * Imagem de cobertura nunca exibe ID já classificado como VT ou notícia.
 * Não há exclusão nem escrita nas planilhas de origem.
 */
export function classificarAcervoAgrocultura({ vts = [], noticias = [], coberturas = [] } = {}) {
  const vtsUnicos = consolidarPorMediaId(vts);
  const noticiasUnicas = consolidarPorMediaId(noticias);
  const imagensUnicas = consolidarPorMediaId(coberturas);
  const idsPrioritarios = new Set([...vtsUnicos, ...noticiasUnicas].map((r) => r.id));
  const coberturaFiltrada = imagensUnicas.filter((r) => !idsPrioritarios.has(r.id));

  return {
    vts: vtsUnicos,
    noticias: noticiasUnicas,
    coberturas: coberturaFiltrada,
    removidosDaCobertura: imagensUnicas.length - coberturaFiltrada.length,
  };
}
