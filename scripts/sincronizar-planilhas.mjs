import process from "node:process";
import { google } from "googleapis";
import { extrairMediaIds, validarConteudoMediaIds } from "./media-id.mjs";

const PLANILHA_IMGS_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";
const NOME_ABA_IMGS = "imgs";
const RANGE_IMGS = `${NOME_ABA_IMGS}!A2:H`;

const FONTES = [
  { nome: "Agrocultura", spreadsheetId: "1TAXhVqLIT7P3GIxY6SQqEQE95xwjPpSX_0daCTtd8To", range: "fonte_agrocultura!A2:H" },
  { nome: "Repórter Eco", spreadsheetId: "18svdvx85wPpKOhkBlFPr0zRATZ4AFu2TdEO4y4WgkWc", range: "fonte_reporter_eco!A2:H" },
  { nome: "Jornal da Cultura", spreadsheetId: "1dDqdYeslxm0CE_gZkC3nH7sNmUfh4JQry981VSYXmuk", range: "fonte_jc!A2:H" },
];

const credenciaisJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!credenciaisJson) throw new Error("Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");

let credentials;
try { credentials = JSON.parse(credenciaisJson); }
catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não contém JSON válido."); }

const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth });

function limparTexto(valor) {
  return String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function separarIds(valor) {
  return extrairMediaIds(valor);
}

function normalizarCampoIds(valor, contexto) {
  const analise = validarConteudoMediaIds(valor);
  if (!analise.ids.length) {
    throw new Error(`${contexto}: nenhum Media ID reconhecido em "${limparTexto(valor)}"`);
  }
  if (!analise.valido) {
    throw new Error(`${contexto}: conteúdo inesperado junto aos Media IDs: ${limparTexto(valor)}`);
  }
  return analise.ids.join("\n");
}

function normalizarLinhaBase(linha = []) {
  return Array.from({ length: 8 }, (_, i) => limparTexto(linha[i]));
}

function normalizarLinha(linha = [], contexto = "registro") {
  const resultado = normalizarLinhaBase(linha);
  if (resultado[0]) resultado[0] = normalizarCampoIds(resultado[0], contexto);
  return resultado;
}

async function carregarFonte(fonte) {
  const resposta = await sheets.spreadsheets.values.get({ spreadsheetId: fonte.spreadsheetId, range: fonte.range });
  const linhas = resposta.data.values || [];
  const validas = [];
  let ignoradas = 0;

  linhas.forEach((linha, indice) => {
    try {
      const normalizada = normalizarLinha(linha, `${fonte.nome}, linha ${indice + 2}`);
      if (separarIds(normalizada[0]).length) validas.push(normalizada);
    } catch (erro) {
      ignoradas++;
      console.warn(`Registro de fonte ignorado: ${erro.message}`);
    }
  });

  console.log(`${fonte.nome}: ${validas.length} registros válidos; ${ignoradas} ignorados.`);
  return validas;
}

async function carregarImgs() {
  const resposta = await sheets.spreadsheets.values.get({ spreadsheetId: PLANILHA_IMGS_ID, range: RANGE_IMGS });
  return (resposta.data.values || []).map((linha, indice) => {
    try {
      return normalizarLinha(linha, `imgs, linha ${indice + 2}`);
    } catch (erro) {
      console.warn(`Linha existente preservada sem sincronização automática: ${erro.message}`);
      return normalizarLinhaBase(linha);
    }
  });
}

async function obterSheetIdImgs() {
  const resposta = await sheets.spreadsheets.get({
    spreadsheetId: PLANILHA_IMGS_ID,
    fields: "sheets(properties(sheetId,title))",
  });
  const aba = (resposta.data.sheets || []).find((item) => item.properties?.title === NOME_ABA_IMGS);
  if (!aba?.properties || aba.properties.sheetId === undefined) throw new Error(`Aba ${NOME_ABA_IMGS} não encontrada.`);
  return aba.properties.sheetId;
}

async function removerDuplicatasIdenticas(imgs) {
  const primeiraLinhaPorConteudo = new Map();
  const linhasParaExcluir = [];

  imgs.forEach((linha, indice) => {
    const ids = separarIds(linha[0]);
    if (!ids.length) return;
    const chave = JSON.stringify(linha);
    if (primeiraLinhaPorConteudo.has(chave)) linhasParaExcluir.push(indice + 2);
    else primeiraLinhaPorConteudo.set(chave, indice + 2);
  });

  if (!linhasParaExcluir.length) return 0;
  const sheetId = await obterSheetIdImgs();
  const requests = linhasParaExcluir.sort((a, b) => b - a).map((numeroLinha) => ({
    deleteDimension: {
      range: { sheetId, dimension: "ROWS", startIndex: numeroLinha - 1, endIndex: numeroLinha }
    }
  }));

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: PLANILHA_IMGS_ID, requestBody: { requests } });
  console.log(`Linhas totalmente duplicadas removidas: ${linhasParaExcluir.length}`);
  return linhasParaExcluir.length;
}

function mesclarRegistro(atual, fonte) {
  const resultado = [...atual];
  resultado[0] = [...new Set([...separarIds(atual[0]), ...separarIds(fonte[0])])].join("\n");
  for (let i = 1; i < 8; i++) if (fonte[i]) resultado[i] = fonte[i];
  return resultado;
}

function construirIndiceExistentes(imgs) {
  const mapa = new Map();
  const conflitos = new Set();

  imgs.forEach((linha, indice) => {
    const ids = separarIds(linha[0]);
    if (!ids.length) return;
    const registro = { tipo: "existente", linhaPlanilha: indice + 2, dados: linha };

    ids.forEach((id) => {
      const anterior = mapa.get(id);
      if (anterior && anterior.linhaPlanilha !== registro.linhaPlanilha) conflitos.add(id);
      else mapa.set(id, registro);
    });
  });

  return { mapa, conflitos };
}

function registrarIdsNoMapa(mapa, registro) {
  separarIds(registro.dados[0]).forEach((id) => mapa.set(id, registro));
}

async function main() {
  console.log("Iniciando sincronização...");

  let imgs = await carregarImgs();
  const removidas = await removerDuplicatasIdenticas(imgs);
  if (removidas) imgs = await carregarImgs();

  const { mapa: existentesPorId, conflitos: conflitosExistentes } = construirIndiceExistentes(imgs);
  if (conflitosExistentes.size) {
    console.warn(`Media IDs presentes em mais de uma linha foram bloqueados contra atualização automática: ${[...conflitosExistentes].join(", ")}`);
  }

  const pendentesPorId = new Map();
  const pendentes = [];
  const atualizacoesPorLinha = new Map();
  let conflitosFonte = 0;
  let bloqueadosPorDuplicidade = 0;

  for (const fonte of FONTES) {
    for (const registro of await carregarFonte(fonte)) {
      const ids = separarIds(registro[0]);

      if (ids.some((id) => conflitosExistentes.has(id))) {
        bloqueadosPorDuplicidade++;
        console.warn(`${fonte.nome}: registro ${ids.join(", ")} não atualizado porque um dos IDs aparece em mais de uma linha da imgs.`);
        continue;
      }

      const encontrados = [...new Set(ids.map((id) => existentesPorId.get(id) || pendentesPorId.get(id)).filter(Boolean))];

      if (encontrados.length > 1) {
        conflitosFonte++;
        console.warn(`${fonte.nome}: registro ${ids.join(", ")} ignorado porque aponta para linhas diferentes.`);
        continue;
      }

      const alvo = encontrados[0];
      if (alvo) {
        const dadosNovos = mesclarRegistro(alvo.dados, registro);
        if (JSON.stringify(dadosNovos) !== JSON.stringify(alvo.dados)) {
          alvo.dados = dadosNovos;
          if (alvo.tipo === "existente") atualizacoesPorLinha.set(alvo.linhaPlanilha, dadosNovos);
        }
        registrarIdsNoMapa(alvo.tipo === "existente" ? existentesPorId : pendentesPorId, alvo);
        continue;
      }

      const pendente = { tipo: "pendente", dados: registro };
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

  console.log("Sincronização finalizada.");
  console.log(`Linhas totalmente duplicadas removidas: ${removidas}`);
  console.log(`Linhas atualizadas: ${atualizacoesPorLinha.size}`);
  console.log(`Novos registros: ${pendentes.length}`);
  console.log(`Conflitos de fonte ignorados com segurança: ${conflitosFonte}`);
  console.log(`Registros bloqueados por Media ID duplicado na imgs: ${bloqueadosPorDuplicidade}`);
  console.log(`Total de Media IDs indexados: ${new Set([...existentesPorId.keys(), ...pendentesPorId.keys()]).size}`);
}

main().catch((erro) => {
  console.error("Erro na sincronização:", erro);
  process.exitCode = 1;
});