import fs from "node:fs/promises";
import process from "node:process";
import { google } from "googleapis";
import { criarSnapshotCatalogo } from "./catalogo-snapshot.mjs";

const PLANILHA_IMGS_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";
const RANGE_IMGS = "imgs!A2:H";
const ARQUIVO_SAIDA = "data/catalogo-acervo.json";

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
  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId: PLANILHA_IMGS_ID,
    range: RANGE_IMGS,
  });

  const linhas = resposta.data.values || [];
  const snapshot = criarSnapshotCatalogo(linhas);

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(
    ARQUIVO_SAIDA,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8"
  );

  console.log(`Snapshot principal: ${snapshot.total} registro(s) publicados em ${ARQUIVO_SAIDA}.`);
}

main().catch((erro) => {
  console.error("Erro ao gerar snapshot principal do catálogo:", erro);
  process.exitCode = 1;
});
