import process from "node:process";
import { google } from "googleapis";

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

async function prepararColuna({ nome, spreadsheetId, sheetTitle, obrigatorio }) {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties(sheetId,title,gridProperties(rowCount))",
    });
    const sheet = (metadata.data.sheets || []).find(
      (item) => item.properties?.title === sheetTitle
    );
    if (!sheet?.properties) throw new Error(`Aba ${sheetTitle} não encontrada.`);

    const rowCount = Number(sheet.properties.gridProperties?.rowCount || 1);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheet.properties.sheetId,
                startRowIndex: 0,
                endRowIndex: rowCount,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: { type: "TEXT", pattern: "@" },
                },
              },
              fields: "userEnteredFormat.numberFormat",
            },
          },
        ],
      },
    });
    console.log(`${nome}: coluna de Media ID configurada como texto.`);
  } catch (erro) {
    if (obrigatorio) throw erro;
    const status = erro?.response?.status || erro?.code || "erro";
    console.warn(`${nome}: não foi possível configurar a coluna como texto (${status}).`);
  }
}

for (const alvo of ALVOS) {
  await prepararColuna(alvo);
}
