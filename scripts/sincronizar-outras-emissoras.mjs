// Todas as abas visíveis são emissoras, inclusive as ainda vazias.
// Nunca altera a planilha de origem nem o snapshot do acervo principal.
import fs from "node:fs/promises";
import process from "node:process";
import { google } from "googleapis";
import { criarSnapshot, PLANILHA_OUTRAS_EMISSORAS } from "../js/outras-emissoras-data.js";

async function main() {
  const secret = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!secret) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");
  let credentials;
  try { credentials = JSON.parse(secret); }
  catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON inválido."); }
  const auth = new google.auth.GoogleAuth({
    credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.get({
    spreadsheetId: PLANILHA_OUTRAS_EMISSORAS,
    fields: "sheets(properties(title,index,hidden))"
  });
  const nomes = (res.data.sheets || [])
    .filter((aba) => !aba.properties?.hidden && aba.properties?.title)
    .sort((a,b) => (a.properties?.index ?? 0) - (b.properties?.index ?? 0))
    .map((aba) => aba.properties.title);
  if (!nomes.length) throw new Error("Nenhuma aba visível encontrada.");
  const ranges = nomes.map((nome) => `'${nome.replaceAll("'", "''")}'!A1:C`);
  const data = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: PLANILHA_OUTRAS_EMISSORAS, ranges
  });
  const tabelas = data.data.valueRanges || [];
  if (tabelas.length !== nomes.length) throw new Error("Leitura incompleta da planilha.");
  const abas = nomes.map((nome, i) => {
    const linhas = tabelas[i].values || [];
    if (linhas.length) {
      const campos = (linhas[0] || []).slice(0,3).map((x) => String(x || "").trim().toUpperCase());
      if (campos.join("|") !== "ID|IMAGEM|DATA") {
        throw new Error(`Cabeçalho inválido na aba "${nome}". Esperado: ID, IMAGEM, DATA.`);
      }
    }
    return { nome, linhas: linhas.slice(1) };
  });
  // Escrita somente após validação completa, para preservar a última cópia se houver falha.
  const snapshot = criarSnapshot(abas);
  await fs.writeFile(new URL("../data/outras-emissoras.json", import.meta.url),
    JSON.stringify(snapshot,null,2) + "\n","utf8");
  const total = snapshot.emissoras.reduce((n,e) => n + e.registros.length,0);
  console.log(`Sincronizadas ${snapshot.emissoras.length} emissoras e ${total} conteúdos.`);
}
main().catch((e) => { console.error("Erro ao sincronizar outras emissoras:",e.message); process.exitCode=1; });
