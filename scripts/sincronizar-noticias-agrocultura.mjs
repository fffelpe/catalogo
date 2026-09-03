import process from "node:process";
import { google } from "googleapis";
import { extrairMediaIds } from "./media-id.mjs";

const PLANILHA_IMGS_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";
const PLANILHA_NOTICIAS_ID = "1LIkpJyIxTV7o4Zz1uJ90ZZTDfedTNsihfJB14CsewRw";
const ABA_IMGS = "imgs";
const RANGE_IMGS = `${ABA_IMGS}!A2:I`;

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

function idsDoValor(valor) {
  return extrairMediaIds(valor);
}

function normalizarLinhaImgs(linha = []) {
  const resultado = Array.from({ length: 9 }, (_, i) => limparTexto(linha[i]));
  const ids = idsDoValor(resultado[0]);
  if (ids.length) resultado[0] = ids.join("\n");
  return resultado;
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
  const registros = [];

  for (const linha of resposta.data.values || []) {
    const ids = idsDoValor(linha[1]);
    if (!ids.length) continue;

    registros.push([
      ids.join("\n"),
      limparTexto(linha[3]),
      limparTexto(linha[2]),
      limparTexto(linha[4]),
      limparTexto(linha[5]),
      limparTexto(linha[6]),
      limparTexto(linha[8]) || "AGROCULTURA",
      limparTexto(linha[7]),
      limparTexto(linha[0]),
    ]);
  }

  console.log(`Notícias/stand-ups: ${registros.length} registros com Media ID encontrados.`);
  return registros;
}

async function garantirNoveColunasImgs() {
  const resposta = await sheets.spreadsheets.get({
    spreadsheetId: PLANILHA_IMGS_ID,
    fields: "sheets.properties(sheetId,title,gridProperties(columnCount))",
  });

  const aba = (resposta.data.sheets || []).find(
    (item) => item.properties?.title === ABA_IMGS
  );

  if (!aba?.properties) throw new Error(`Aba ${ABA_IMGS} não encontrada na planilha imgs.`);

  const colunasAtuais = Number(aba.properties.gridProperties?.columnCount || 0);
  if (colunasAtuais >= 9) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: PLANILHA_IMGS_ID,
    requestBody: {
      requests: [
        {
          appendDimension: {
            sheetId: aba.properties.sheetId,
            dimension: "COLUMNS",
            length: 9 - colunasAtuais,
          },
        },
      ],
    },
  });

  console.log(`Aba ${ABA_IMGS} expandida de ${colunasAtuais} para 9 colunas.`);
}

async function carregarImgs() {
  const resposta = await sheets.spreadsheets.values.get({ spreadsheetId: PLANILHA_IMGS_ID, range: RANGE_IMGS });
  return (resposta.data.values || []).map(normalizarLinhaImgs);
}

function mesclar(atual, origem) {
  const resultado = [...atual];
  const ids = [...new Set([...idsDoValor(atual[0]), ...idsDoValor(origem[0])])];
  resultado[0] = ids.join("\n");
  for (let i = 1; i < 9; i += 1) {
    if (origem[i]) resultado[i] = origem[i];
  }
  return resultado;
}

function registrarIds(mapa, registro) {
  idsDoValor(registro.dados[0]).forEach((id) => mapa.set(id, registro));
}

async function garantirCabecalhoPgm() {
  await garantirNoveColunasImgs();
  await sheets.spreadsheets.values.update({
    spreadsheetId: PLANILHA_IMGS_ID,
    range: `${ABA_IMGS}!I1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["PGM"]] },
  });
}

async function main() {
  console.log("Iniciando integração de notícias/stand-ups do AgroCultura...");
  await garantirCabecalhoPgm();

  const [imgs, noticias] = await Promise.all([carregarImgs(), carregarNoticias()]);
  const existentesPorId = new Map();

  imgs.forEach((linha, indice) => {
    if (!idsDoValor(linha[0]).length) return;
    registrarIds(existentesPorId, {
      tipo: "existente",
      linhaPlanilha: indice + 2,
      dados: linha,
    });
  });

  const pendentesPorId = new Map();
  const pendentes = [];
  const atualizacoesPorLinha = new Map();

  for (const noticia of noticias) {
    const ids = idsDoValor(noticia[0]);
    const alvos = [...new Set(
      ids.map((id) => existentesPorId.get(id) || pendentesPorId.get(id)).filter(Boolean)
    )];

    if (alvos.length > 1) {
      throw new Error(`Os IDs ${ids.join(", ")} da mesma notícia já pertencem a linhas diferentes na imgs.`);
    }

    let alvo = alvos[0];
    if (!alvo) {
      alvo = { tipo: "pendente", linhaPlanilha: null, dados: noticia };
      pendentes.push(alvo);
      registrarIds(pendentesPorId, alvo);
      continue;
    }

    const dadosNovos = mesclar(alvo.dados, noticia);
    if (JSON.stringify(dadosNovos) === JSON.stringify(alvo.dados)) continue;

    alvo.dados = dadosNovos;
    if (alvo.tipo === "existente") {
      atualizacoesPorLinha.set(alvo.linhaPlanilha, dadosNovos);
      registrarIds(existentesPorId, alvo);
    } else {
      registrarIds(pendentesPorId, alvo);
    }
  }

  if (atualizacoesPorLinha.size) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: PLANILHA_IMGS_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [...atualizacoesPorLinha.entries()].map(([linha, values]) => ({
          range: `${ABA_IMGS}!A${linha}:I${linha}`,
          values: [values],
        })),
      },
    });
  }

  if (pendentes.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: PLANILHA_IMGS_ID,
      range: `${ABA_IMGS}!A:I`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: pendentes.map((item) => item.dados) },
    });
  }

  console.log(`Integração concluída. Linhas atualizadas: ${atualizacoesPorLinha.size}; novos registros: ${pendentes.length}; total origem: ${noticias.length}.`);
}

main().catch((erro) => {
  console.error("Erro na integração de notícias:", erro);
  process.exitCode = 1;
});