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

  // A coluna 0 é o Media ID, gerenciado separadamente por cada integração.
  for (let i = 1; i < ate; i += 1) {
    const recebido = String(origem[i] ?? "").trim();
    if (!recebido) continue;

    const existente = String(resultado[i] ?? "").trim();
    if (!existente) {
      resultado[i] = recebido;
    } else if (chaveComparacao(existente) !== chaveComparacao(recebido)) {
      registrarConflito({
        campo: nomesCampos[i] || `COLUNA_${i + 1}`,
        existente,
        recebido,
      });
    }
  }
  return resultado;
}
