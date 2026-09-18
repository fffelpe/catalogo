import { extrairMediaIds } from "./media-id.mjs";

export function extrairMediaIdDoNome(nome) {
  const semExtensao = String(nome || "").replace(/\.[^.]+$/, "");
  const ids = extrairMediaIds(semExtensao);
  return ids.length === 1 ? ids[0] : "";
}

export function arquivoEhOficial(arquivo) {
  const nome = String(arquivo?.name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR");

  return /(^|[^A-Z0-9])OFICIAL(?=$|[^A-Z0-9])/.test(nome);
}

export function resolverCandidatosCredito(id, arquivos = []) {
  const candidatos = Array.isArray(arquivos) ? [...arquivos] : [];

  if (!candidatos.length) {
    return {
      id,
      tipo: "sem-arquivo",
      escolhido: null,
      oficiais: [],
      motivo: "nenhum documento disponível"
    };
  }

  if (candidatos.length === 1) {
    return {
      id,
      tipo: "unico",
      escolhido: candidatos[0],
      oficiais: arquivoEhOficial(candidatos[0]) ? [candidatos[0]] : [],
      motivo: "único documento disponível"
    };
  }

  const oficiais = candidatos.filter(arquivoEhOficial);

  if (oficiais.length === 1) {
    return {
      id,
      tipo: "oficial",
      escolhido: oficiais[0],
      oficiais,
      motivo: "há duplicidade, mas existe exatamente uma versão marcada como OFICIAL"
    };
  }

  if (!oficiais.length) {
    return {
      id,
      tipo: "conflito",
      escolhido: null,
      oficiais: [],
      motivo: "documentos duplicados sem versão oficial definida"
    };
  }

  return {
    id,
    tipo: "conflito",
    escolhido: null,
    oficiais,
    motivo: "mais de um documento está marcado como OFICIAL"
  };
}
