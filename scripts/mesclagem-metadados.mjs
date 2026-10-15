// Mesclagem conservadora entre fontes com mesmo Media ID.
// Preenche apenas campos vazios e reporta divergências sem apagá-las.
export function chaveComparacao(valor) {
  return String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function mesclarCamposPreservando(atual = [], origem = [], opcoes = {}) {
  const {
    nomesCampos = [],
    registrarConflito = () => {},
    ate = Math.max(atual.length, origem.length),
  } = opcoes;
  const resultado = [...atual];

  // Uma divergência no assunto, data ou autoria bloqueia complementos
  // potencialmente associados a outra matéria que recebeu o mesmo ID.
  const camposIdentidade = new Set(["DESCRIÇÃO", "DATA", "LOCAL", "REPÓRTER", "AFILIADA", "AFILIADA / EMISSORA", "PROGRAMA", "PGM"]);
  const preencher = [];
  let conflitoIdentidade = false;
  for (let i = 1; i < ate; i += 1) {
    const recebido = String(origem[i] ?? "").trim();
    if (!recebido) continue;
    const existente = String(resultado[i] ?? "").trim();
    const campo = nomesCampos[i] || ("COLUNA_" + (i + 1));
    if (!existente) {
      preencher.push([i, recebido]);
    } else if (chaveComparacao(existente) !== chaveComparacao(recebido)) {
      registrarConflito({ campo, existente, recebido });
      if (camposIdentidade.has(campo)) conflitoIdentidade = true;
    }
  }
  if (!conflitoIdentidade) {
    preencher.forEach(([i, recebido]) => { resultado[i] = recebido; });
  }
  return resultado;
}
