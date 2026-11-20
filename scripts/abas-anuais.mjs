// A origem pode ter uma aba antiga ou uma aba para cada ano.
function normalizarTitulo(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim().toLocaleUpperCase("pt-BR");
}
export function selecionarAbasAnuaisOuLegada(sheets, prefixoLegado) {
  const visiveis = (Array.isArray(sheets) ? sheets : [])
    .map((aba) => aba?.properties || {})
    .filter((p) => p.hidden !== true && String(p.title || "").trim());
  const anos = visiveis.filter((p) => /^(19|20)\d{2}$/.test(p.title.trim()))
    .sort((a,b) => Number(a.title) - Number(b.title) || (a.index ?? 0) - (b.index ?? 0))
    .map((p) => p.title.trim());
  if (anos.length) return anos;
  const alvo = normalizarTitulo(prefixoLegado);
  const legada = visiveis.find((p) => normalizarTitulo(p.title).startsWith(alvo));
  if (legada) return [legada.title];
  const disponiveis = visiveis.map((p) => p.title).join(", ") || "(nenhuma)";
  throw new Error('Nenhuma aba anual ou iniciada por "' + prefixoLegado +
    '" foi encontrada. Abas disponíveis: ' + disponiveis);
}
export async function listarAbasAnuaisOuLegada(sheets, spreadsheetId, prefixoLegado) {
  const resposta = await sheets.spreadsheets.get({
    spreadsheetId, fields: "sheets(properties(title,hidden,index))"
  });
  return selecionarAbasAnuaisOuLegada(resposta.data.sheets, prefixoLegado);
}
export function intervaloDaAba(titulo, intervalo) {
  return "'" + String(titulo).replaceAll("'", "''") + "'!" + intervalo;
}
