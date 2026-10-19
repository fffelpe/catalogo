// A combinação ID do arquivo + nome + timestamp evita reaproveitar conteúdo alterado.
// Também invalida o cache se a regra de seleção (único/OFICIAL) mudar.
export function podeReutilizarCredito(arquivo, anterior, tipoSelecao) {
  if (!arquivo || !anterior || !anterior.arquivo || !anterior.selecao) return false;
  const dados = anterior.arquivo;
  return Boolean(
    arquivo.id && arquivo.modifiedTime
    && dados.id === arquivo.id
    && dados.nome === arquivo.name
    && dados.atualizadoEm === arquivo.modifiedTime
    && dados.mimeType === arquivo.mimeType
    && anterior.selecao.tipo === tipoSelecao
    && String(anterior.textoCompleto || "").trim()
  );
}
