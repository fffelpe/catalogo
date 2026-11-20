// Dados compartilhados pela página e pelo sincronizador de outras emissoras.
export const PLANILHA_OUTRAS_EMISSORAS = "194DqGYvEiFug_S0Vf5GC2WSlGG79vCX2CMTqrCmPugs";
const texto = (v) => String(v ?? "").replace(/\u00a0/g," ").trim();
export const idValido = (v) => /^\d{4}[A-Z]\d{6}$/.test(texto(v).toUpperCase());
export function registroDaLinha(linha = []) {
  const [ID, IMAGEM, DATA] = [linha[0], linha[1], linha[2]].map(texto);
  if (!ID && !IMAGEM && !DATA) return null;
  return { ID: ID.toUpperCase(), IMAGEM, DATA };
}
export function criarSnapshot(abas = []) {
  return {
    schemaVersion: 1,
    fonte: { spreadsheetId: PLANILHA_OUTRAS_EMISSORAS },
    emissoras: abas.map(({ nome, linhas = [] }) => ({
      nome: texto(nome),
      registros: linhas.map(registroDaLinha).filter(Boolean)
    })).filter(({ nome }) => nome)
  };
}
function chave(valor) {
  return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
}
export function pesquisar(registros, termo) {
  const busca = chave(termo);
  return !busca ? [...registros] :
    registros.filter((r) => [r.ID,r.IMAGEM,r.DATA].some((v) => chave(v).includes(busca)));
}
