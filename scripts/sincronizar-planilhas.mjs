import process from "node:process";
import { google } from "googleapis";

// ========================================================
// CONFIGURAÇÃO
// ========================================================

const PLANILHA_IMGS_ID =
  "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";

const FONTES = [
  {
    nome: "Agrocultura",
    spreadsheetId:
      "1TAXhVqLIT7P3GIxY6SQqEQE95xwjPpSX_0daCTtd8To",
    range: "fonte_agrocultura!A2:H",
  },

  {
    nome: "Repórter Eco",
    spreadsheetId:
      "18svdvx85wPpKOhkBlFPr0zRATZ4AFu2TdEO4y4WgkWc",
    range: "fonte_reporter_eco!A2:H",
  },

  {
    nome: "Jornal da Cultura",
    spreadsheetId:
      "1dDqdYeslxm0CE_gZkC3nH7sNmUfh4JQry981VSYXmuk",
    range: "fonte_jc!A2:H",
  },
];

const RANGE_IMGS = "imgs!A2:H";

// ========================================================
// AUTENTICAÇÃO
// ========================================================

const credenciaisJson =
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!credenciaisJson) {
  throw new Error(
    "Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado."
  );
}

let credentials;

try {
  credentials = JSON.parse(credenciaisJson);
} catch {
  throw new Error(
    "GOOGLE_SERVICE_ACCOUNT_JSON não contém JSON válido."
  );
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

// ========================================================
// NORMALIZAÇÃO
// ========================================================

function limparTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarId(valor) {
  return limparTexto(valor).toUpperCase();
}

function normalizarLinha(linha = []) {
  return Array.from(
    { length: 8 },
    (_, indice) => limparTexto(linha[indice])
  );
}

// ========================================================
// LEITURA
// ========================================================

async function carregarFonte(fonte) {
  const resposta =
    await sheets.spreadsheets.values.get({
      spreadsheetId: fonte.spreadsheetId,
      range: fonte.range,
    });

  const linhas = resposta.data.values || [];

  console.log(
    `${fonte.nome}: ${linhas.length} linhas encontradas`
  );

  return linhas
    .map(normalizarLinha)
    .filter((linha) => normalizarId(linha[0]));
}

async function carregarImgs() {
  const resposta =
    await sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_IMGS_ID,
      range: RANGE_IMGS,
    });

  return (resposta.data.values || [])
    .map(normalizarLinha);
}

// ========================================================
// MESCLAGEM
// ========================================================

function mesclarRegistro(atual, fonte) {
  const resultado = [...atual];

  // ID
  resultado[0] = normalizarId(
    atual[0] || fonte[0]
  );

  // DESCRIÇÃO
  if (fonte[1]) {
    resultado[1] = fonte[1];
  }

  // DATA
  if (fonte[2]) {
    resultado[2] = fonte[2];
  }

  // LOCAL
  if (fonte[3]) {
    resultado[3] = fonte[3];
  }

  // REPÓRTER
  if (fonte[4]) {
    resultado[4] = fonte[4];
  }

  // EMISSORA
  if (fonte[5]) {
    resultado[5] = fonte[5];
  }

  // PROGRAMA
  if (fonte[6]) {
    resultado[6] = fonte[6];
  }

  // EDITORIA
  if (fonte[7]) {
    resultado[7] = fonte[7];
  }

  return resultado;
}

// ========================================================
// SINCRONIZAÇÃO
// ========================================================

async function main() {
  console.log("Iniciando sincronização...");

  const imgs = await carregarImgs();

  const mapa = new Map();

  // -----------------------------------
  // Dados existentes
  // -----------------------------------

  imgs.forEach((linha, indice) => {
    const id = normalizarId(linha[0]);

    if (!id) {
      return;
    }

    if (!mapa.has(id)) {
      mapa.set(id, {
        linhaPlanilha: indice + 2,
        dados: linha,
      });
    }
  });

  let atualizados = 0;
  let novos = 0;

  const atualizacoes = [];
  const novasLinhas = [];

  // -----------------------------------
  // Processar fontes
  // -----------------------------------

  for (const fonte of FONTES) {
    const registros =
      await carregarFonte(fonte);

    for (const registro of registros) {
      const id = normalizarId(registro[0]);

      if (!id) {
        continue;
      }

      const existente = mapa.get(id);

      // ===================================
      // ID EXISTE
      // ===================================

      if (existente) {
        const dadosNovos =
          mesclarRegistro(
            existente.dados,
            registro
          );

        const mudou =
          JSON.stringify(dadosNovos) !==
          JSON.stringify(existente.dados);

        if (mudou) {
          atualizacoes.push({
            range:
              `imgs!A${existente.linhaPlanilha}:H${existente.linhaPlanilha}`,
            values: [dadosNovos],
          });

          existente.dados = dadosNovos;

          atualizados++;
        }

        continue;
      }

      // ===================================
      // ID NOVO
      // ===================================

      const novaLinha =
        normalizarLinha(registro);

      novasLinhas.push(novaLinha);

      mapa.set(id, {
        linhaPlanilha: null,
        dados: novaLinha,
      });

      novos++;
    }
  }

  // ========================================================
  // ATUALIZAR REGISTROS EXISTENTES
  // ========================================================

  if (atualizacoes.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: PLANILHA_IMGS_ID,

      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: atualizacoes,
      },
    });
  }

  // ========================================================
  // ADICIONAR NOVOS IDs
  // ========================================================

  if (novasLinhas.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: PLANILHA_IMGS_ID,
      range: "imgs!A:H",

      valueInputOption: "USER_ENTERED",

      insertDataOption: "INSERT_ROWS",

      requestBody: {
        values: novasLinhas,
      },
    });
  }

  // ========================================================
  // RESULTADO
  // ========================================================

  console.log("");
  console.log("Sincronização finalizada.");
  console.log(`Atualizados: ${atualizados}`);
  console.log(`Novos: ${novos}`);
  console.log(
    `Total processado: ${mapa.size}`
  );
}

main().catch((erro) => {
  console.error(
    "Erro na sincronização:",
    erro
  );

  process.exitCode = 1;
});