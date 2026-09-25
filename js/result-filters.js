// result-filters.js - Regras puras de refinamento da tabela de resultados.
(function (global) {
  "use strict";

  const CAMPOS_CATEGORIA = [
    "LOCAL",
    "REPORTER",
    "AFILIADA_EMISSORA",
    "PROGRAMA",
    "EDITORIA"
  ];

  function normalizarTexto(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  function dataParaNumero(valor) {
    const texto = String(valor ?? "").trim();
    if (!texto) return null;

    let ano;
    let mes;
    let dia;

    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      ano = Number(iso[1]);
      mes = Number(iso[2]);
      dia = Number(iso[3]);
    } else {
      const br = texto.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
      if (!br) return null;
      dia = Number(br[1]);
      mes = Number(br[2]);
      ano = Number(br[3]);
    }

    if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

    return (ano * 10000) + (mes * 100) + dia;
  }

  function valoresSelecionados(filtros, campo) {
    const valores = Array.isArray(filtros?.[campo]) ? filtros[campo] : [];
    return valores
      .map(normalizarTexto)
      .filter(Boolean);
  }

  function aplicar(registros, filtros = {}) {
    const itens = Array.isArray(registros) ? registros : [];
    const inicio = dataParaNumero(filtros.dataInicio);
    const fim = dataParaNumero(filtros.dataFim);
    const selecoes = Object.fromEntries(
      CAMPOS_CATEGORIA.map((campo) => [campo, valoresSelecionados(filtros, campo)])
    );

    return itens.filter((item) => {
      if (inicio !== null || fim !== null) {
        const dataItem = dataParaNumero(item?.DATA);
        if (dataItem === null) return false;
        if (inicio !== null && dataItem < inicio) return false;
        if (fim !== null && dataItem > fim) return false;
      }

      for (const campo of CAMPOS_CATEGORIA) {
        const selecionados = selecoes[campo];
        if (!selecionados.length) continue;
        const valorItem = normalizarTexto(item?.[campo]);
        if (!selecionados.includes(valorItem)) return false;
      }

      return true;
    });
  }

  function obterOpcoes(registros, campo) {
    const mapa = new Map();

    for (const item of Array.isArray(registros) ? registros : []) {
      const valor = String(item?.[campo] ?? "").trim();
      const chave = normalizarTexto(valor);
      if (!chave || mapa.has(chave)) continue;
      mapa.set(chave, valor);
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );
  }

  function temFiltros(filtros = {}) {
    if (String(filtros.dataInicio ?? "").trim()) return true;
    if (String(filtros.dataFim ?? "").trim()) return true;

    return CAMPOS_CATEGORIA.some((campo) =>
      Array.isArray(filtros[campo]) && filtros[campo].some((valor) => String(valor ?? "").trim())
    );
  }

  global.ResultFilters = Object.freeze({
    CAMPOS_CATEGORIA,
    aplicar,
    obterOpcoes,
    temFiltros,
    normalizarTexto,
    dataParaNumero
  });
})(typeof window !== "undefined" ? window : globalThis);
