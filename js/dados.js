// js/dados.js

export const PLANILHAS_URLS = [
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1685526249&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1257444550&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1171982976&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=796043664&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1173010890&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1458299234&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1109137516&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=261089273&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub?gid=1910417967&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSX3y6fM1xsCVo8wEeWucqSqULseoVsImz18IqlxHv0daSoVhWc2nVT4_RulI60F0-LkFxbRofoyqj-/pub?gid=2130460378&single=true&output=csv",
  // LINK CORRIGIDO PARA FORMATO CSV PUBLICADO
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRsS_bVQeJ2-PKIJ3pG8RrcmxACWWNITaNw104cm5QsSObYLtJmjvt_8h1N3U-Pv5PhO2MiePtRzxfS/pub?gid=377444393&single=true&output=csv"
];

// Parser simples de CSV que lida com aspas e vírgulas
function parseCSVLine(str) {
  const arr = [];
  let quote = false;
  let col = '';
  for (let c of str) {
    if (c === '"') {
      quote = !quote;
    } else if (c === ',' && !quote) {
      arr.push(col.trim());
      col = '';
    } else {
      col += c;
    }
  }
  arr.push(col.trim());
  return arr;
}

function csvParaObjetos(csvText) {
  const linhas = csvText.split(/\r?\n/).filter(linha => linha.trim() !== '');
  if (linhas.length < 2) return [];

  const headers = parseCSVLine(linhas[0]).map(h => h.toLowerCase().trim());

  return linhas.slice(1).map(linha => {
    const valores = parseCSVLine(linha);
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = valores[index] ? valores[index].replace(/^"|"$/g, '') : '';
    });

    // Mapeamento flexível de cabeçalhos
    return {
      id: obj['id'] || obj['código'] || obj['codigo'] || obj['id_midia'] || 'SEM-ID',
      titulo: obj['titulo'] || obj['título'] || obj['matéria'] || obj['materia'] || obj['nome'] || 'Sem título',
      programa: obj['programa'] || obj['editoria'] || 'Geral',
      data: obj['data'] || obj['exibição'] || obj['exibicao'] || '',
      link: obj['link'] || obj['url'] || obj['drive'] || '#'
    };
  });
}

// Download paralelo com tratamento individual de erros e cache em sessionStorage
export async function buscarTodasAsMidias() {
  const CACHE_KEY = 'catalogo_midias_data';
  const cache = sessionStorage.getItem(CACHE_KEY);

  if (cache) {
    return JSON.parse(cache);
  }

  const promessas = PLANILHAS_URLS.map(async (url) => {
    try {
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const texto = await resposta.text();
      if (texto.trim().startsWith('<')) return []; // Se for HTML de erro do Google
      return csvParaObjetos(texto);
    } catch (erro) {
      console.warn(`Erro ao carregar fonte (${url}):`, erro);
      return [];
    }
  });

  const resultados = await Promise.all(promessas);
  const dadosConsolidados = resultados.flat();

  if (dadosConsolidados.length > 0) {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(dadosConsolidados));
  }

  return dadosConsolidados;
}

// Busca insensível a maiúsculas, minúsculas e acentos
export function filtrarMidias(midias, termo, programa = null) {
  const normalizar = (text) => text ? text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

  const termoNorm = normalizar(termo);
  const programaNorm = normalizar(programa);

  return midias.filter(item => {
    const batePrograma = !programaNorm || normalizar(item.programa).includes(programaNorm) || programaNorm.includes(normalizar(item.programa));
    
    if (!termoNorm) return batePrograma;

    const bateId = normalizar(item.id).includes(termoNorm);
    const bateTitulo = normalizar(item.titulo).includes(termoNorm);

    return batePrograma && (bateId || bateTitulo);
  });
}