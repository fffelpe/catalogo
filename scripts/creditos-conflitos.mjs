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

function conflitoAnteriorPorId(statusAnterior = {}, id) {
  const conflitos = Array.isArray(statusAnterior?.conflitos) ? statusAnterior.conflitos : [];
  const duplicados = Array.isArray(statusAnterior?.duplicados) ? statusAnterior.duplicados : [];
  return conflitos.find((item) => item?.id === id)
    || duplicados.find((item) => item?.id === id)
    || null;
}

export function avaliarNovidadeConflito(id, arquivos = [], statusAnterior = {}, creditoAnterior = null) {
  const anterior = conflitoAnteriorPorId(statusAnterior, id);
  const idsConhecidos = new Set(
    (Array.isArray(anterior?.arquivos) ? anterior.arquivos : [])
      .map((item) => String(item?.id || "").trim())
      .filter(Boolean)
  );

  const idCreditoAnterior = String(creditoAnterior?.arquivo?.id || "").trim();
  if (idCreditoAnterior) idsConhecidos.add(idCreditoAnterior);

  const novosArquivos = (Array.isArray(arquivos) ? arquivos : [])
    .filter((arquivo) => {
      const arquivoId = String(arquivo?.id || "").trim();
      return arquivoId && !idsConhecidos.has(arquivoId);
    });

  const bloqueanteAnterior = Boolean(
    anterior?.bloqueante
    || anterior?.rejeitado
    || (Array.isArray(statusAnterior?.rejeitadosNovos)
      && statusAnterior.rejeitadosNovos.some((item) => item?.id === id))
  );

  return {
    novo: novosArquivos.length > 0,
    bloqueante: bloqueanteAnterior || novosArquivos.length > 0,
    novosArquivos
  };
}

export function instrucoesParaConflito(id, resolucao = {}) {
  const exemplo = `${id} - OFICIAL`;

  if (Array.isArray(resolucao.oficiais) && resolucao.oficiais.length > 1) {
    return [
      "Escolha qual dos documentos listados é a versão oficial correta.",
      "Mantenha a palavra OFICIAL no nome de apenas esse documento.",
      "Remova a palavra OFICIAL do nome de todas as outras versões do mesmo Media ID, ou mova/exclua as versões obsoletas da pasta de créditos.",
      `Use como padrão de nome: "${exemplo}" (mantendo a extensão quando houver).`,
      "Execute novamente a sincronização. Até a resolução, a versão anterior do crédito permanece preservada."
    ];
  }

  return [
    "Escolha qual dos documentos listados é a versão oficial correta.",
    `Renomeie somente o documento escolhido para incluir a palavra OFICIAL. Exemplo: "${exemplo}" (mantendo a extensão quando houver).`,
    "Não marque mais de um documento do mesmo Media ID como OFICIAL.",
    "Opcionalmente, mova ou exclua da pasta de créditos as versões duplicadas que não devem mais participar da sincronização.",
    "Execute novamente a sincronização. Até a resolução, a versão anterior do crédito permanece preservada."
  ];
}
