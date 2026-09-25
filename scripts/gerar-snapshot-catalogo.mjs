import fs from "node:fs/promises";
import process from "node:process";
import { google } from "googleapis";
import { criarMapaDuracoes, criarSnapshotCatalogo } from "./catalogo-snapshot.mjs";

const PLANILHA_IMGS_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";
const RANGE_IMGS = "imgs!A2:I";
const PLANILHA_DURACOES_ID = "1zrG3ULT16FxN7wWiFpeYtSvXAXuOaQ1NQ1brA0pXStQ";
const RANGE_DURACOES = "'Página1'!A:B";
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
  const [respostaImgs, respostaDuracoes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_IMGS_ID,
      range: RANGE_IMGS,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_DURACOES_ID,
      range: RANGE_DURACOES,
    }),
  ]);

  const linhas = respostaImgs.data.values || [];
  const duracoesPorId = criarMapaDuracoes(respostaDuracoes.data.values || []);
  const snapshot = criarSnapshotCatalogo(linhas, { duracoesPorId });

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(
    ARQUIVO_SAIDA,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `Snapshot principal: ${snapshot.total} registro(s) publicados em ${ARQUIVO_SAIDA}; ` +
    `${Object.keys(duracoesPorId).length} duração(ões) disponíveis para cruzamento.`
  );
}

main().catch((erro) => {
  console.error("Erro ao gerar snapshot principal do catálogo:", erro);
  process.exitCode = 1;
});
