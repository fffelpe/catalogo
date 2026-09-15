import process from "node:process";
import { google } from "googleapis";
import { extrairMediaIds, validarConteudoMediaIds } from "./media-id.mjs";
import { normalizarMediaId, programaPorListaDeIds } from "./programa-por-prefixo.mjs";
import { ehErroPermissaoGoogle } from "./google-sheets-errors.mjs";

const PLANILHA_IMGS_ID = "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs";
const NOME_ABA_IMGS = "imgs";
const RANGE_IMGS = `${NOME_ABA_IMGS}!A2:H`;

const PLANILHA_AGROCULTURA_ID = "1TAXhVqLIT7P3GIxY6SQqEQE95xwjPpSX_0daCTtd8To";
const ABA_AGROCULTURA = "fonte_agrocultura";
const PLANILHA_MATERIAS_ID = "1Ny0gjt-4du7cJ-ejgahfhdplnCBl58d6RV7kfuLjKM0";
const PLANILHA_NOTICIAS_ID = "1LIkpJyIxTV7o4Zz1uJ90ZZTDfedTNsihfJB14CsewRw";
const ABAS_MATERIAS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const ABA_VTS_FAUSTINO = "VTS FAUSTINO";
const PREFIXO_ABA_NOTICIAS = "NOTÍCIAS E OUTRAS NOTÍCIAS QUE";

function transformarMateriasNaoExibidas(linha = []) {
  // Origem: RECEBIDO EM | ID | REPÓRTER | FILIADA | MATÉRIAS
  // imgs:   ID | DESCRIÇÃO | DATA | LOCAL | REPÓRTER | EMISSORA | PROGRAMA | EDITORIA
  return [linha[1], linha[4], linha[0], "", linha[2], linha[3], "", ""];
}

const FONTES = [
  { nome: "Agrocultura", spreadsheetId: PLANILHA_AGROCULTURA_ID, range: `${ABA_AGROCULTURA}!A2:H` },
  { nome: "Repórter Eco", spreadsheetId: "18svdvx85wPpKOhkBlFPr0zRATZ4AFu2TdEO4y4WgkWc", range: "fonte_reporter_eco!A2:H" },
  { nome: "Jornal da Cultura", spreadsheetId: "1dDqdYeslxm0CE_gZkC3nH7sNmUfh4JQry981VSYXmuk", range: "fonte_jc!A2:H" },
  { nome: "De Olho no Voto", spreadsheetId: "1R6vI1r78DoXykV_5oGu_uVq1MVf6lmpEx_XZ8eM1Lbs", range: "Página1!A2:H" },
  { nome: "Documentos Jornalismo", spreadsheetId: "1-HU6N_9OVWiNkPAMuevUcyFa32ocDA_uFMyAh7m9PTo", range: "Página1!A2:H" },
  {
    nome: "Matérias que não foram ao ar",
    spreadsheetId: "1snKWDdgFQ1T-AXdEU6Hof9V2B56v5qkQKfUjrzobtGU",
    range: "'MATÉRIAS QUE NÃO FORAM AO AR'!A2:E",
    transformar: transformarMateriasNaoExibidas,
  },
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
  return extrairMediaIds(valor).map(normalizarMediaId);
}

function normalizarCampoIds(valor, contexto) {
  const analise = validarConteudoMediaIds(valor);
  if (!analise.ids.length) {
    throw new Error(`${contexto}: nenhum Media ID reconhecido em "${limparTexto(valor)}"`);
  }
  if (!analise.valido) {
    throw new Error(`${contexto}: conteúdo inesperado junto aos Media IDs: ${limparTexto(valor)}`);
  }
  return analise.ids.map(normalizarMediaId).join("\n");
}

function normalizarLinhaBase(linha = []) {
  return Array.from({ length: 8 }, (_, i) => limparTexto(linha[i]));
}

function normalizarLinha(linha = [], contexto = "registro") {
  const resultado = normalizarLinhaBase(linha);
  if (!resultado[0]) return resultado;

  resultado[0] = normalizarCampoIds(resultado[0], contexto);
  const ids = separarIds(resultado[0]);
  resultado[6] = programaPorListaDeIds(ids);
  return resultado;
}

async function carregarFonte(fonte) {
  let linhas;
  try {
    const resposta = await sheets.spreadsheets.values.get({ spreadsheetId: fonte.spreadsheetId, range: fonte.range });
    linhas = resposta.data.values || [];
  } catch (erro) {
    const status = erro?.response?.status || erro?.code || "erro";
    console.warn(`${fonte.nome}: fonte indisponível (${status}); as demais fontes continuarão sendo sincronizadas.`);
    return [];
  }

  const validas = [];
  let ignoradas = 0;

  linhas.forEach((linhaOriginal, indice) => {
    try {
      const linha = typeof fonte.transformar === "function" ? fonte.transformar(linhaOriginal) : linhaOriginal;
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
  const atualizacoesNormalizacao = new Map();

  const linhas = (resposta.data.values || []).map((linha, indice) => {
    const base = normalizarLinhaBase(linha);
    try {
      const normalizada = normalizarLinha(linha, `imgs, linha ${indice + 2}`);
      if (JSON.stringify(normalizada) !== JSON.stringify(base)) {
        atualizacoesNormalizacao.set(indice + 2, normalizada);
      }
      return normalizada;
    } catch (erro) {
      console.warn(`Linha existente preservada sem sincronização automática: ${erro.message}`);
      return base;
    }
  });

  return { linhas, atualizacoesNormalizacao };
}

async function obterSheetId(spreadsheetId, titulo) {
  const resposta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const aba = (resposta.data.sheets || []).find((item) => item.properties?.title === titulo);
  if (!aba?.properties || aba.properties.sheetId === undefined) {
    throw new Error(`Aba ${titulo} não encontrada.`);
  }
  return aba.properties.sheetId;
}

async function obterSheetIdImgs() {
  return obterSheetId(PLANILHA_IMGS_ID, NOME_ABA_IMGS);
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
  resultado[6] = programaPorListaDeIds(separarIds(resultado[0]));
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

function idsDeValueRanges(valueRanges = []) {
  const resultado = new Set();
  valueRanges.forEach((valueRange) => {
    (valueRange.values || []).forEach((linha) => {
      separarIds(linha[0] || "").forEach((id) => resultado.add(id));
    });
  });
  return resultado;
}

async function encontrarAbaPorPrefixo(spreadsheetId, prefixo) {
  const resposta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  const alvo = limparTexto(prefixo).toLocaleUpperCase("pt-BR");
  const aba = (resposta.data.sheets || []).find((item) =>
    limparTexto(item.properties?.title).toLocaleUpperCase("pt-BR").startsWith(alvo)
  );
  if (!aba?.properties?.title) throw new Error(`Aba iniciada por "${prefixo}" não encontrada.`);
  return aba.properties.title;
}

async function carregarIdsJaUtilizadosAgrocultura() {
  const rangesMaterias = [
    ...ABAS_MATERIAS.map((aba) => `'${aba}'!D2:D`),
    `'${ABA_VTS_FAUSTINO}'!C2:C`,
  ];

  const respostaMaterias = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: PLANILHA_MATERIAS_ID,
    ranges: rangesMaterias,
  });
  const idsUsados = idsDeValueRanges(respostaMaterias.data.valueRanges || []);

  const tituloNoticias = await encontrarAbaPorPrefixo(PLANILHA_NOTICIAS_ID, PREFIXO_ABA_NOTICIAS);
  const tituloEscapado = tituloNoticias.replaceAll("'", "''");
  const respostaNoticias = await sheets.spreadsheets.values.get({
    spreadsheetId: PLANILHA_NOTICIAS_ID,
    range: `'${tituloEscapado}'!B2:B`,
  });
  (respostaNoticias.data.values || []).forEach((linha) => {
    separarIds(linha[0] || "").forEach((id) => idsUsados.add(id));
  });

  return idsUsados;
}

async function removerAgroculturaJaUtilizados() {
  const idsUsados = await carregarIdsJaUtilizadosAgrocultura();
  if (!idsUsados.size) return 0;

  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId: PLANILHA_AGROCULTURA_ID,
    range: `${ABA_AGROCULTURA}!A2:A`,
  });

  const linhasParaExcluir = [];
  const atualizacoesParciais = [];

  (resposta.data.values || []).forEach((linha, indice) => {
    const numeroLinha = indice + 2;
    const ids = separarIds(linha[0] || "");
    if (!ids.length) return;

    const restantes = ids.filter((id) => !idsUsados.has(id));
    if (restantes.length === ids.length) return;

    if (!restantes.length) {
      linhasParaExcluir.push(numeroLinha);
      return;
    }

    atualizacoesParciais.push({
      range: `${ABA_AGROCULTURA}!A${numeroLinha}`,
      values: [[restantes.join("\n")]],
    });
  });

  if (atualizacoesParciais.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: PLANILHA_AGROCULTURA_ID,
      requestBody: { valueInputOption: "USER_ENTERED", data: atualizacoesParciais },
    });
  }

  if (linhasParaExcluir.length) {
    const sheetId = await obterSheetId(PLANILHA_AGROCULTURA_ID, ABA_AGROCULTURA);
    const requests = linhasParaExcluir.sort((a, b) => b - a).map((numeroLinha) => ({
      deleteDimension: {
        range: { sheetId, dimension: "ROWS", startIndex: numeroLinha - 1, endIndex: numeroLinha }
      }
    }));
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: PLANILHA_AGROCULTURA_ID,
      requestBody: { requests },
    });
  }

  const removidos = linhasParaExcluir.length + atualizacoesParciais.length;
  console.log(`Agrocultura: ${removidos} registro(s) retirado(s) do estoque porque o Media ID já foi usado em matérias/notícias.`);
  return removidos;
}

async function main() {
  console.log("Iniciando sincronização...");

  let carregamentoImgs = await carregarImgs();
  let imgs = carregamentoImgs.linhas;
  let atualizacoesNormalizacao = carregamentoImgs.atualizacoesNormalizacao;

  const removidas = await removerDuplicatasIdenticas(imgs);
  if (removidas) {
    carregamentoImgs = await carregarImgs();
    imgs = carregamentoImgs.linhas;
    atualizacoesNormalizacao = carregamentoImgs.atualizacoesNormalizacao;
  }

  const { mapa: existentesPorId, conflitos: conflitosExistentes } = construirIndiceExistentes(imgs);
  if (conflitosExistentes.size) {
    console.warn(`Media IDs presentes em mais de uma linha foram bloqueados contra atualização automática: ${[...conflitosExistentes].join(", ")}`);
  }

  const pendentesPorId = new Map();
  const pendentes = [];
  const atualizacoesPorLinha = new Map(atualizacoesNormalizacao);
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

  // A fonte AgroCultura é estoque. Só removemos depois de garantir que os registros
  // foram preservados/atualizados na imgs, que funciona como índice histórico geral.
  let removidosDoEstoqueAgro = 0;
  try {
    removidosDoEstoqueAgro = await removerAgroculturaJaUtilizados();
  } catch (erro) {
    if (!ehErroPermissaoGoogle(erro)) throw erro;
    console.warn(
      "Agrocultura: não foi possível remover automaticamente IDs já utilizados porque a conta de serviço não tem permissão de edição na fonte_agrocultura. A sincronização de imgs continuará."
    );
  }

  console.log("Sincronização finalizada.");
  console.log(`Linhas totalmente duplicadas removidas: ${removidas}`);
  console.log(`Linhas atualizadas/normalizadas: ${atualizacoesPorLinha.size}`);
  console.log(`Novos registros: ${pendentes.length}`);
  console.log(`Registros retirados do estoque Agrocultura: ${removidosDoEstoqueAgro}`);
  console.log(`Conflitos de fonte ignorados com segurança: ${conflitosFonte}`);
  console.log(`Registros bloqueados por Media ID duplicado na imgs: ${bloqueadosPorDuplicidade}`);
  console.log(`Total de Media IDs indexados: ${new Set([...existentesPorId.keys(), ...pendentesPorId.keys()]).size}`);
}

main().catch((erro) => {
  console.error("Erro na sincronização:", erro);
  process.exitCode = 1;
});
