import process from "node:process";
import { google } from "googleapis";

const PLANILHA_IMGS_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";
const PLANILHA_NOTICIAS_ID = "1LIkpJyIxTV7o4Zz1uJ90ZZTDfedTNsihfJB14CsewRw";
const RANGE_IMGS = "imgs!A2:I";

const credenciaisJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!credenciaisJson) throw new Error("Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");

let credentials;
try {
  credentials = JSON.parse(credenciaisJson);
} catch {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não contém JSON válido.");
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

function limparTexto(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarId(valor) {
  return limparTexto(valor).replace(/\.mp4$/i, "").replace(/\s+/g, "").toUpperCase();
}

function normalizarLinhaImgs(linha = []) {
  return Array.from({ length: 9 }, (_, i) => limparTexto(linha[i]));
}

async function descobrirAbaNoticias() {
  const resposta = await sheets.spreadsheets.get({
    spreadsheetId: PLANILHA_NOTICIAS_ID,
    fields: "sheets.properties.title",
  });

  const encontrada = (resposta.data.sheets || [])
    .map((aba) => aba.properties?.title)
    .filter(Boolean)
    .find((titulo) => titulo.toLocaleUpperCase("pt-BR").startsWith("NOTÍCIAS E OUTRAS NOTÍCIAS"));

  if (!encontrada) throw new Error("Não foi encontrada a aba de notícias na planilha configurada.");
  return encontrada;
}

async function carregarNoticias() {
  const aba = await descobrirAbaNoticias();
  const range = `'${aba.replaceAll("'", "''")}'!A2:I`;
  const resposta = await sheets.spreadsheets.values.get({ spreadsheetId: PLANILHA_NOTICIAS_ID, range });
  const porId = new Map();

  for (const linha of resposta.data.values || []) {
    // Origem: PGM, ID, DATA, ASSUNTO, UF, REPÓRTER, AFILIADA / EMISSORA, EDITORIA, PROGRAMA.
    const id = normalizarId(linha[1]);
    if (!id) continue;

    const registro = [
      id,
      limparTexto(linha[3]),
      limparTexto(linha[2]),
      limparTexto(linha[4]),
      limparTexto(linha[5]),
      limparTexto(linha[6]),
      limparTexto(linha[8]) || "AGROCULTURA",
      limparTexto(linha[7]),
      limparTexto(linha[0]), // PGM preservado em imgs!I
    ];

    if (!porId.has(id)) porId.set(id, registro);
    else {
      const atual = porId.get(id);
      porId.set(id, atual.map((valor, indice) => registro[indice] || valor));
    }
  }

  console.log(`Notícias/stand-ups: ${porId.size} IDs únicos encontrados.`);
  return [...porId.values()];
}

async function carregarImgs() {
  const resposta = await sheets.spreadsheets.values.get({ spreadsheetId: PLANILHA_IMGS_ID, range: RANGE_IMGS });
  return (resposta.data.values || []).map(normalizarLinhaImgs);
}

function mesclar(atual, origem) {
  const resultado = [...atual];
  resultado[0] = normalizarId(atual[0] || origem[0]);
  for (let i = 1; i < 9; i += 1) {
    if (origem[i]) resultado[i] = origem[i];
  }
  return resultado;
}

async function garantirCabecalhoPgm() {
  await sheets.spreadsheets.values.update({
    spreadsheetId: PLANILHA_IMGS_ID,
    range: "imgs!I1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["PGM"]] },
  });
}

async function main() {
  console.log("Iniciando integração de notícias/stand-ups do AgroCultura...");
  await garantirCabecalhoPgm();

  const [imgs, noticias] = await Promise.all([carregarImgs(), carregarNoticias()]);
  const mapaImgs = new Map();

  imgs.forEach((linha, indice) => {
    const id = normalizarId(linha[0]);
    if (!id || mapaImgs.has(id)) return;
    mapaImgs.set(id, { linhaPlanilha: indice + 2, dados: linha });
  });

  const atualizacoes = [];
  const novasLinhas = [];
  let atualizados = 0;
  let novos = 0;

  for (const noticia of noticias) {
    const id = normalizarId(noticia[0]);
    const existente = mapaImgs.get(id);

    if (existente) {
      const dadosNovos = mesclar(existente.dados, noticia);
      if (JSON.stringify(dadosNovos) !== JSON.stringify(existente.dados)) {
        atualizacoes.push({
          range: `imgs!A${existente.linhaPlanilha}:I${existente.linhaPlanilha}`,
          values: [dadosNovos],
        });
        existente.dados = dadosNovos;
        atualizados += 1;
      }
      continue;
    }

    novasLinhas.push(noticia);
    mapaImgs.set(id, { linhaPlanilha: null, dados: noticia });
    novos += 1;
  }

  if (atualizacoes.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: PLANILHA_IMGS_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: atualizacoes },
    });
  }

  if (novasLinhas.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: PLANILHA_IMGS_ID,
      range: "imgs!A:I",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: novasLinhas },
    });
  }

  console.log(`Integração concluída. Atualizados: ${atualizados}; novos: ${novos}; total origem: ${noticias.length}.`);
}

main().catch((erro) => {
  console.error("Erro na integração de notícias:", erro);
  process.exitCode = 1;
});
