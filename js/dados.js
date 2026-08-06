// Configure aqui cada aba publicada e o tipo de conteúdo que ela representa.
const FONTES_DADOS = [
  // --- Matérias que foram ao ar (uma linha por aba/ano) ---
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1685526249&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1257444550&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1171982976&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=796043664&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1173010890&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1458299234&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1109137516&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=261089273&single=true&output=csv", tipo: "materia" },
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1910417967&single=true&output=csv", tipo: "materia" },

  // --- Imagens gerais ---
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbj8sKo4fUnZtcuZ9xHqAR_IfU1W1qQUoPXGJ5CkA6SZftl_eJe2VbZ_-9h0_oimiag1iy0GNV0cmc/pub?gid=2024290431&single=true&output=csv", tipo: "imagem" },

  // --- Notícias e stand-ups ---
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSX3y6fM1xsCVo8wEeWucqSqULseoVsImz18IqlxHv0daSoVhWc2nVT4_RulI60F0-LkFxbRofoyqj-/pub?gid=2130460378&single=true&output=csv", tipo: "noticia" },
];

// TODO: hoje todo item normalizado abaixo recebe programa fixo "agrocultura".
// Enquanto isso não mudar, a busca por outros programas (Roda Viva, Jornal
// da Cultura etc.) sempre vai voltar vazia. Quando cada aba/planilha tiver
// uma coluna (ou fonte separada) indicando o programa, troque a linha
// `programa: "agrocultura"` de cada função normalizar* para ler esse valor,
// ex.: `programa: (row.PROGRAMA || "").trim().toLowerCase()`.

function normalizarMateria(row) {
  const id = (row.ID || "").trim();
  if (!id) return [];
  return [{
    id,
    tipo: "materia",
    programa: "agrocultura",
    pgm: (row.PGM || "").trim(),
    data: (row.DATA || "").trim(),
    reporter: (row.REPORTER || "").trim(),
    local: "",
    assunto: (row.VT || "").trim(),
  }];
}

function normalizarImagem(row) {
  const idsBrutos = (row.ID || "").trim();
  if (!idsBrutos) return [];
  // separa células com mais de um ID (espaço ou barra "/")
  const ids = idsBrutos.split(/[\s/]+/).map(s => s.trim()).filter(Boolean);
  return ids.map(id => ({
    id,
    tipo: "imagem",
    programa: "agrocultura",
    pgm: "",
    data: (row.DATA || "").trim(),
    reporter: "",
    local: (row.ESTADO || "").trim(),
    assunto: (row.DETALHES || "").trim(),
  }));
}

function normalizarNoticia(row) {
  const id = (row.ID || "").trim();
  const idUpper = id.toUpperCase();
  // ignora linhas placeholder ("REPÓRTER CHAMA") e linhas vazias
  if (!id || idUpper.includes("REPÓRTER CHAMA") || idUpper.includes("REPORTER CHAMA")) return [];
  return [{
    id,
    tipo: "noticia",
    programa: "agrocultura",
    pgm: (row.PGM || "").trim(),
    data: (row.DATA || "").trim(),
    reporter: (row["REPÓRTER"] || "").trim(),
    local: (row.UF || "").trim(),
    assunto: (row.ASSUNTO || "").trim(),
  }];
}

const NORMALIZADORES = {
  materia: normalizarMateria,
  imagem: normalizarImagem,
  noticia: normalizarNoticia,
};

function buscarFonte(fonte) {
  return new Promise((resolve) => {
    Papa.parse(fonte.url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const normalizador = NORMALIZADORES[fonte.tipo];
        resolve(results.data.flatMap(row => normalizador(row)));
      },
      error: () => resolve([]), // uma fonte falhando não derruba as outras
    });
  });
}

async function carregarTodosOsDados() {
  const resultados = await Promise.all(FONTES_DADOS.map(buscarFonte));
  return resultados.flat();
}