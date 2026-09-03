import process from "node:process";
import { google } from "googleapis";

const PLANILHA_IMGS_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";
const NOME_ABA_IMGS = "imgs";
const RANGE_IMGS = `${NOME_ABA_IMGS}!A2:H`;
const MEDIA_ID_RE = /^\d{4}B\d{6}$/i;
const MEDIA_ID_GLOBAL_RE = /\d{4}B\d{6}/gi;

const FONTES = [
  { nome: "Agrocultura", spreadsheetId: "1TAXhVqLIT7P3GIxY6SQqEQE95xwjPpSX_0daCTtd8To", range: "fonte_agrocultura!A2:H" },
  { nome: "Repórter Eco", spreadsheetId: "18svdvx85wPpKOhkBlFPr0zRATZ4AFu2TdEO4y4WgkWc", range: "fonte_reporter_eco!A2:H" },
  { nome: "Jornal da Cultura", spreadsheetId: "1dDqdYeslxm0CE_gZkC3nH7sNmUfh4JQry981VSYXmuk", range: "fonte_jc!A2:H" },
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

function limparTexto(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarId(valor) {
  return limparTexto(valor).replace(/\s+/g, "").toUpperCase();
}

function separarIds(valor) {
  const original = String(valor || "").toUpperCase();
  return [...new Set(original.match(MEDIA_ID_GLOBAL_RE) || [])].map(normalizarId);
}

function normalizarCampoIds(valor, contexto) {
  const original = String(valor || "").toUpperCase();
  const ids = separarIds(original);

  if (!ids.length) {
    throw new Error(`${contexto}: campo de Media ID preenchido, mas nenhum ID válido foi reconhecido: ${limparTexto(valor)}`);
  }

  // Depois de retirar os IDs, só podem restar separadores históricos aceitos.
  // Isso cobre células como "ID1+ID2", "ID1 / ID2", vírgula, ponto e vírgula ou quebra de linha.
  const restante = original
    .replace(MEDIA_ID_GLOBAL_RE, "")
    .replace(/[\s,;+\/|&-]+/g, "");

  if (restante) {
    throw new Error(`${contexto}: conteúdo inesperado junto aos Media IDs: ${limparTexto(valor)}`);
  }

  const invalidos = ids.filter((id) => !MEDIA_ID_RE.test(id));
  if (invalidos.length) {
    throw new Error(`${contexto}: Media ID inválido: ${invalidos.join(", ")}`);
  }

  return ids.join("\n");
}

function normalizarLinha(linha = [], contexto = "registro") {
  const resultado = Array.from({ length: 8 }, (_, indice) => limparTexto(linha[indice]));
  if (resultado[0]) resultado[0] = normalizarCampoIds(resultado[0], contexto);
  return resultado;
}

async function carregarFonte(fonte) {
  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId: fonte.spreadsheetId,
    range: fonte.range,
  });
  const linhas = resposta.data.values || [];
  console.log(`${fonte.nome}: ${linhas.length} linhas encontradas`);
  return linhas
    .map((linha, indice) => normalizarLinha(linha, `${fonte.nome}, linha ${indice + 2}`))
    .filter((linha) => separarIds(linha[0]).length);
}

async function carregarImgs() {
  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId: PLANILHA_IMGS_ID,
    range: RANGE_IMGS,
  });
  return (resposta.data.values || []).map((linha, indice) =>
    normalizarLinha(linha, `imgs, linha ${indice + 2}`)
  );
}

async function obterSheetIdImgs() {
  const resposta = await sheets.spreadsheets.get({
    spreadsheetId: PLANILHA_IMGS_ID,
    fields: "sheets(properties(sheetId,title))",
  });
  const aba = (resposta.data.sheets || []).find((item) => item.properties?.title === NOME_ABA_IMGS);
  if (!aba?.properties?.sheetId && aba?.properties?.sheetId !== 0) {
    throw new Error(`Aba ${NOME_ABA_IMGS} não encontrada.`);
  }
  return aba.properties.sheetId;
}

async function removerDuplicatasExatas(imgs) {
  const primeiraLinhaPorChave = new Map();
  const linhasParaExcluir = [];
  const idsVistos = new Map();
  const conflitos = [];

  imgs.forEach((linha, indice) => {
    const numeroLinha = indice + 2;
    const ids = separarIds(linha[0]);
    if (!ids.length) return;

    const chave = ids.slice().sort().join("|");
    if (primeiraLinhaPorChave.has(chave)) {
      linhasParaExcluir.push(numeroLinha);
      return;
    }
    primeiraLinhaPorChave.set(chave, numeroLinha);

    ids.forEach((id) => {
      if (idsVistos.has(id)) {
        conflitos.push(`${id} nas linhas ${idsVistos.get(id)} e ${numeroLinha}`);
      } else {
        idsVistos.set(id, numeroLinha);
      }
    });
  });

  if (conflitos.length) {
    throw new Error(
      `Há Media IDs repetidos em células diferentes e a remoção automática seria ambígua: ${conflitos.join("; ")}`
    );
  }

  if (!linhasParaExcluir.length) return 0;

  const sheetId = await obterSheetIdImgs();
  const requests = linhasParaExcluir
    .sort((a, b) => b - a)
    .map((numeroLinha) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: numeroLinha - 1,
          endIndex: numeroLinha,
        },
      },
    }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: PLANILHA_IMGS_ID,
    requestBody: { requests },
  });

  console.log(`Duplicatas exatas removidas: ${linhasParaExcluir.length}`);
  return linhasParaExcluir.length;
}

function mesclarRegistro(atual, fonte) {
  const resultado = [...atual];
  const idsMesclados = [...new Set([...separarIds(atual[0]), ...separarIds(fonte[0])])];
  resultado[0] = idsMesclados.join("\n");

  for (let indice = 1; indice < 8; indice++) {
    if (fonte[indice]) resultado[indice] = fonte[indice];
  }
  return resultado;
}

function registrarIdsNoMapa(mapa, registro) {
  separarIds(registro.dados[0]).forEach((id) => mapa.set(id, registro));
}

async function main() {
  console.log("Iniciando sincronização...");

  let imgs = await carregarImgs();
  const removidas = await removerDuplicatasExatas(imgs);
  if (removidas) imgs = await carregarImgs();

  const existentesPorId = new Map();
  imgs.forEach((linha, indice) => {
    if (!separarIds(linha[0]).length) return;
    registrarIdsNoMapa(existentesPorId, {
      tipo: "existente",
      linhaPlanilha: indice + 2,
      dados: linha,
    });
  });

  const pendentesPorId = new Map();
  const pendentes = [];
  const atualizacoesPorLinha = new Map();
  const linhasAtualizadas = new Set();

  for (const fonte of FONTES) {
    const registros = await carregarFonte(fonte);

    for (const registro of registros) {
      const ids = separarIds(registro[0]);
      const encontrados = ids
        .map((id) => existentesPorId.get(id) || pendentesPorId.get(id))
        .filter(Boolean);
      const unicos = [...new Set(encontrados)];

      if (unicos.length > 1) {
        throw new Error(`${fonte.nome}: os IDs ${ids.join(", ")} apontam para registros diferentes; sincronização interrompida para evitar mesclagem incorreta.`);
      }

      const alvo = unicos[0];
      if (alvo) {
        const dadosNovos = mesclarRegistro(alvo.dados, registro);
        if (JSON.stringify(dadosNovos) !== JSON.stringify(alvo.dados)) {
          alvo.dados = dadosNovos;
          if (alvo.tipo === "existente") {
            atualizacoesPorLinha.set(alvo.linhaPlanilha, dadosNovos);
            linhasAtualizadas.add(alvo.linhaPlanilha);
          }
        }

        registrarIdsNoMapa(alvo.tipo === "existente" ? existentesPorId : pendentesPorId, alvo);
        continue;
      }

      const pendente = { tipo: "pendente", dados: normalizarLinha(registro, fonte.nome) };
      pendentes.push(pendente);
      registrarIdsNoMapa(pendentesPorId, pendente);
    }
  }

  if (atualizacoesPorLinha.size) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: PLANILHA_IMGS_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [...atualizacoesPorLinha.entries()].map(([linha, values]) => ({
          range: `${NOME_ABA_IMGS}!A${linha}:H${linha}`,
          values: [values],
        })),
      },
    });
  }

  if (pendentes.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: PLANILHA_IMGS_ID,
      range: `${NOME_ABA_IMGS}!A:H`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: pendentes.map((item) => item.dados) },
    });
  }

  console.log("");
  console.log("Sincronização finalizada.");
  console.log(`Duplicatas exatas removidas: ${removidas}`);
  console.log(`Linhas atualizadas: ${linhasAtualizadas.size}`);
  console.log(`Novos registros: ${pendentes.length}`);
  console.log(`Total de Media IDs indexados: ${new Set([...existentesPorId.keys(), ...pendentesPorId.keys()]).size}`);
}

main().catch((erro) => {
  console.error("Erro na sincronização:", erro);
  process.exitCode = 1;
});
