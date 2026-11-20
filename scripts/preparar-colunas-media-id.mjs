import process from "node:process";
import { google } from "googleapis";
import { selecionarAbasAnuaisOuLegada } from "./abas-anuais.mjs";

const ALVOS = [
  {
    nome: "imgs",
    spreadsheetId: "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs",
    sheetTitle: "imgs",
    obrigatorio: true,
  },
  {
    nome: "fonte_agrocultura",
    spreadsheetId: "1TAXhVqLIT7P3GIxY6SQqEQE95xwjPpSX_0daCTtd8To",
    sheetTitle: "fonte_agrocultura",
    abasAnuais: true,
    obrigatorio: false,
  },
];

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

async function prepararColuna({ nome, spreadsheetId, sheetTitle, abasAnuais = false, obrigatorio }) {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties(sheetId,title,hidden,index,gridProperties(rowCount))",
    });
    const properties = (metadata.data.sheets || []).map((sheet) => sheet.properties || {});
    const titulos = abasAnuais
      ? selecionarAbasAnuaisOuLegada(metadata.data.sheets, sheetTitle)
      : [sheetTitle];
    const requests = [];
    for (const titulo of titulos) {
      const sheet = properties.find((item) => item.title === titulo);
      if (!sheet || sheet.sheetId === undefined) throw new Error(`Aba ${titulo} não encontrada.`);
      const rowCount = Number(sheet.gridProperties?.rowCount || 1);
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheet.sheetId,
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
          cell: {
            userEnteredFormat: { numberFormat: { type: "TEXT", pattern: "@" } },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      });
    }
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log(`${nome}: coluna Media ID formatada como texto em ${titulos.join(", ")}.`);
  } catch (erro) {
    if (obrigatorio) throw erro;
    const status = erro?.response?.status || erro?.code || erro?.message || "erro";
    console.warn(`${nome}: não foi possível configurar a coluna como texto (${status}).`);
  }
}

for (const alvo of ALVOS) {
  await prepararColuna(alvo);
}
