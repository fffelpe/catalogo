import fs from "node:fs/promises";
import process from "node:process";
import { google } from "googleapis";
import { criarSnapshotAfiliadasReporteres } from "./afiliadas-reporteres-snapshot.mjs";

const PLANILHA_ID = "1S8NDEb_uQt6fAaBY6BMB0EOY1AL5o3VzqoTQjuk01v4";
const RANGE_AFILIADAS = "afiliadas!A2:E";
const RANGE_REPORTERES = "'repórteres'!A2:E";
const ARQUIVO_SAIDA = "data/afiliadas-reporteres.json";

const credenciaisJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!credenciaisJson) {
  throw new Error("Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");
}

let credentials;
try {
  credentials = JSON.parse(credenciaisJson);
} catch {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não contém JSON válido.");
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

async function main() {
  const [respostaAfiliadas, respostaReporteres] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_ID,
      range: RANGE_AFILIADAS,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_ID,
      range: RANGE_REPORTERES,
    }),
  ]);

  const snapshot = criarSnapshotAfiliadasReporteres(
    respostaAfiliadas.data.values || [],
    respostaReporteres.data.values || []
  );

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(ARQUIVO_SAIDA, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(
    `Afiliadas/repórteres: ${snapshot.afiliadas.length} afiliada(s), ` +
    `${snapshot.reporteres.length} repórter(es) publicados em ${ARQUIVO_SAIDA}.`
  );
}

main().catch((erro) => {
  console.error("Erro ao gerar snapshot de afiliadas/repórteres:", erro);
  process.exitCode = 1;
});
