// Nome de exibição de cada programa a partir do slug
const NOMES_PROGRAMAS = {
  "agrocultura": "Agrocultura",
  "mdc": "Matéria de Capa",
  "reporter-eco": "Repórter Eco",
  "documentarios": "Documentários",
  "jornal-da-cultura": "Jornal da Cultura",
  "jornal-da-tarde": "Jornal da Tarde",
  "roda-viva": "Roda Viva",
  "opiniao": "Opinião",
  "cartao-verde": "Cartão Verde",
  "de-olho-no-voto": "De olho no voto",
  "linhas-cruzadas": "Linhas Cruzadas",
  "esta-manha": "Esta Manhã",
  "legiao-estrangeira": "Legião Estrangeira",
  "giro-economico": "Giro Econômico",
};

// Prefixo do ID -> slug do programa
const MAPA_PREFIXO_PROGRAMA = {
  "1452B": "agrocultura",
  "1452E": "agrocultura",
  "2457B": "jornal-da-cultura",
  "1009B": "jornal-da-cultura",
  "1009E": "jornal-da-cultura",
  "2457E": "jornal-da-cultura",
  "2822B": "jornal-da-tarde",
  "2822E": "jornal-da-tarde",
};

function programaPorId(id) {
  const prefixo = (id || "").toUpperCase().slice(0, 5);
  return MAPA_PREFIXO_PROGRAMA[prefixo] || null;
}

function normalizarMateria(row) {
  const id = (row.ID || "").trim();
  if (!id) return [];
  return [{
    id,
    tipo: "materia",
    programa: programaPorId(id),
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
  const ids = idsBrutos.split(/[\s/]+/).map(s => s.trim()).filter(Boolean);
  return ids.map(id => ({
    id,
    tipo: "imagem",
    programa: programaPorId(id),
    pgm: "",
    data: (row.DATA || row["DATA "] || "").trim(),
    reporter: "",
    local: (row.ESTADO || "").trim(),
    assunto: (row.DETALHES || "").trim(),
  }));
}

function normalizarNoticia(row) {
  const id = (row.ID || "").trim();
  const idUpper = id.toUpperCase();
  if (!id || idUpper.includes("REPÓRTER CHAMA") || idUpper.includes("REPORTER CHAMA")) return [];
  return [{
    id,
    tipo: "noticia",
    programa: programaPorId(id),
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

const FONTES_DADOS = [
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1685526249&single=true&output=csv", tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1257444550&single=true&output=csv", tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1171982976&single=true&output=csv", tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=796043664&single=true&output=csv",  tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1173010890&single=true&output=csv", tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1458299234&single=true&output=csv", tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1109137516&single=true&output=csv", tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=261089273&single=true&output=csv",  tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1910417967&single=true&output=csv", tipo: "materia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbj8sKo4fUnZtcuZ9xHqAR_IfU1W1qQUoPXGJ5CkA6SZftl_eJe2VbZ_-9h0_oimiag1iy0GNV0cmc/pub?gid=2024290431&single=true&output=csv", tipo: "imagem"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSX3y6fM1xsCVo8wEeWucqSqULseoVsImz18IqlxHv0daSoVhWc2nVT4_RulI60F0-LkFxbRofoyqj-/pub?gid=2130460378&single=true&output=csv", tipo: "noticia"},
  { url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRsS_bVQeJ2-PKIJ3pG8RrcmxACWWNITaNw104cm5QsSObYLtJmjvt_8h1N3U-Pv5PhO2MiePtRzxfS/pub?gid=377444393&single=true&output=csv",  tipo: "imagem"},
];

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
      error: () => resolve([]),
    });
  });
}

async function carregarTodosOsDados() {
  const resultados = await Promise.all(FONTES_DADOS.map(buscarFonte));
  return resultados.flat();
}