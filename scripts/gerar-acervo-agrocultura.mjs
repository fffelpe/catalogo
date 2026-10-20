import fs from "node:fs/promises";
import process from "node:process";
import { google } from "googleapis";
import { extrairMediaIds } from "./media-id.mjs";
import { construirIndiceLocais, resolverLocal } from "./agrocultura-local.mjs";
import { classificarAcervoAgrocultura } from "./agrocultura-classificacao.mjs";

const PLANILHAS = {
  vts: "1Ny0gjt-4du7cJ-ejgahfhdplnCBl58d6RV7kfuLjKM0",
  noticias: "1LIkpJyIxTV7o4Zz1uJ90ZZTDfedTNsihfJB14CsewRw",
  imagens: "1M4ZVI_ax1ziVttl87FxFC0xxs7zRtVhj9yoIFFUb1aI",
  fonteAgrocultura: "1TAXhVqLIT7P3GIxY6SQqEQE95xwjPpSX_0daCTtd8To",
  naoExibidas: "1snKWDdgFQ1T-AXdEU6Hof9V2B56v5qkQKfUjrzobtGU",
  imgs: "1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs",
};

const ABAS_VTS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const ABA_FAUSTINO = "VTS FAUSTINO";
const ABA_NOTICIAS = "NOTÍCIAS E OUTRAS NOTÍCIAS QUE ";
const ABA_IMAGENS = "Página1";
const ABA_NAO_EXIBIDAS = "MATÉRIAS QUE NÃO FORAM AO AR";
const ABA_FONTE_AGROCULTURA = "fonte_agrocultura";

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
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

function texto(valor) {
  return String(valor ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function ids(valor) {
  return extrairMediaIds(valor);
}

function timestampValido(ano, mes, dia) {
  const a = Number(ano);
  const m = Number(mes);
  const d = Number(dia);
  if (!Number.isInteger(a) || !Number.isInteger(m) || !Number.isInteger(d)) return 0;
  if (m < 1 || m > 12 || d < 1 || d > 31) return 0;

  const data = new Date(Date.UTC(a, m - 1, d));
  if (
    data.getUTCFullYear() !== a ||
    data.getUTCMonth() !== m - 1 ||
    data.getUTCDate() !== d
  ) return 0;

  return data.getTime();
}

function dataParaTimestamp(valor, formato = "dmy") {
  const s = texto(valor);
  if (!s) return 0;

  let m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\D|$)/);
  if (m) {
    let a;
    let mes;
    let dia;
    if (formato === "mdy") {
      [, mes, dia, a] = m;
    } else {
      [, dia, mes, a] = m;
    }
    if (a.length === 2) a = `${Number(a) < 50 ? "20" : "19"}${a}`;
    return timestampValido(a, mes, dia);
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/);
  if (m) return timestampValido(m[1], m[2], m[3]);
  return 0;
}

async function ler(spreadsheetId, range) {
  const resposta = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return resposta.data.values || [];
}

function nomeCabecalho(valor) {
  return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function coluna(linha, cabecalho, ...nomes) {
  const chaves = nomes.map(nomeCabecalho);
  const indice = cabecalho.findIndex((nome) => chaves.includes(nomeCabecalho(nome)));
  return indice < 0 ? "" : linha[indice];
}

async function tentarCarregar(rotulo, funcao) {
  try {
    const registros = await funcao();
    console.log(`${rotulo}: ${registros.length} registros carregados.`);
    return { registros, erro: null };
  } catch (erro) {
    const status = erro?.response?.status || erro?.code || "erro";
    console.warn(`${rotulo}: fonte indisponível (${status}). A publicação deste snapshot será bloqueada.`);
    return { registros: [], erro: String(erro?.message || erro) };
  }
}

function registroBase({ tipo, origem, aba, id, descricao, reporter, data, local, pgm, afiliada, formatoData = "dmy" }) {
  const listaIds = ids(id);
  if (!listaIds.length) return null;
  return {
    tipo,
    origem,
    aba,
    id: listaIds.join("\n"),
    ids: listaIds,
    descricao: texto(descricao),
    reporter: texto(reporter),
    data: texto(data),
    local: texto(local),
    pgm: texto(pgm),
    afiliada: texto(afiliada),
    _timestamp: dataParaTimestamp(data, formatoData),
  };
}

async function carregarLocaisVts() {
  try {
    const linhas = await ler(PLANILHAS.imgs, "'imgs'!A2:D");
    const locaisPorId = construirIndiceLocais(linhas, ids);
    console.log(`Locais dos VTs: ${locaisPorId.size} Media IDs indexados a partir da planilha imgs.`);
    return locaisPorId;
  } catch (erro) {
    const status = erro?.response?.status || erro?.code || "erro";
    console.warn(`Locais dos VTs: lookup da planilha imgs indisponível (${status}); os VTs continuarão sendo gerados sem enriquecimento de local.`);
    return new Map();
  }
}

async function carregarVts() {
  const registros = [];
  const locaisPorId = await carregarLocaisVts();

  for (const aba of ABAS_VTS) {
    const ultimaColuna = Number(aba) <= 2022 ? "E" : "F";
    const [cabecalho = [], ...linhas] = await ler(PLANILHAS.vts, `'${aba}'!A1:${ultimaColuna}`);

    for (const linha of linhas) {
      const id = coluna(linha, cabecalho, "ID", "MEDIA ID");
      const registro = registroBase({
        tipo: "vt",
        origem: "MATÉRIAS QUE FORAM AO AR_",
        aba,
        pgm: coluna(linha, cabecalho, "PGM"),
        descricao: coluna(linha, cabecalho, "VT"),
        reporter: coluna(linha, cabecalho, "REPÓRTER", "REPORTER"),
        id,
        data: coluna(linha, cabecalho, "EXIBIDO", "DATA"),
        afiliada: coluna(linha, cabecalho, "AFILIADA"),
        local: resolverLocal(ids(id), locaisPorId),
      });
      if (registro) registros.push(registro);
    }
  }

  const [cabecalhoFaustino = [], ...faustino] =
    await ler(PLANILHAS.vts, `'${ABA_FAUSTINO}'!A1:D`);
  for (const linha of faustino) {
    const id = coluna(linha, cabecalhoFaustino, "ID");
    const registro = registroBase({
      tipo: "vt",
      origem: "MATÉRIAS QUE FORAM AO AR_",
      aba: ABA_FAUSTINO,
      pgm: coluna(linha, cabecalhoFaustino, "PGM"),
      descricao: coluna(linha, cabecalhoFaustino, "VT"),
      reporter: "BRUNO FAUSTINO",
      id,
      data: coluna(linha, cabecalhoFaustino, "EXIBIDO", "DATA"),
      local: resolverLocal(ids(id), locaisPorId),
    });
    if (registro) registros.push(registro);
  }

  return registros;
}

async function carregarNoticias() {
  const [cabecalho = [], ...linhas] =
    await ler(PLANILHAS.noticias, `'${ABA_NOTICIAS.replaceAll("'", "''")}'!A1:I`);
  const registros = [];

  for (const linha of linhas) {
    const registro = registroBase({
      tipo: "noticias",
      origem: "NOTÍCIAS E OUTRAS NOTÍCIAS QUE FORAM AO AR",
      aba: ABA_NOTICIAS,
      pgm: coluna(linha, cabecalho, "PGM"),
      id: coluna(linha, cabecalho, "ID"),
      data: coluna(linha, cabecalho, "DATA"),
      descricao: coluna(linha, cabecalho, "ASSUNTO"),
      local: coluna(linha, cabecalho, "UF"),
      reporter: coluna(linha, cabecalho, "REPÓRTER"),
      afiliada: coluna(linha, cabecalho, "AFILIADA / EMISSORA"),
    });
    if (registro) registros.push(registro);
  }
  return registros;
}

async function carregarImagensCobertura() {
  const registros = [];
  const [cabecalho = [], ...imagens] = await ler(PLANILHAS.imagens, `'${ABA_IMAGENS}'!A1:D`);

  for (const linha of imagens) {
    const registro = registroBase({
      tipo: "cobertura",
      origem: "IMAGENS AGROCULTURA 15.07.2026",
      aba: ABA_IMAGENS,
      id: coluna(linha, cabecalho, "ID"),
      data: coluna(linha, cabecalho, "DATA"),
      local: coluna(linha, cabecalho, "ESTADO"),
      descricao: coluna(linha, cabecalho, "DETALHES"),
    });
    if (registro) registros.push(registro);
  }
  return registros;
}

async function carregarFonteAgrocultura() {
  const registros = [];
  const [cabecalho = [], ...linhas] =
    await ler(PLANILHAS.fonteAgrocultura, `'${ABA_FONTE_AGROCULTURA}'!A1:H`);

  for (const linha of linhas) {
    const registro = registroBase({
      tipo: "cobertura",
      origem: "fonte_agrocultura",
      aba: ABA_FONTE_AGROCULTURA,
      id: coluna(linha, cabecalho, "ID"),
      data: coluna(linha, cabecalho, "DATA"),
      descricao: coluna(linha, cabecalho, "DESCRIÇÃO", "DESCRICAO"),
      local: coluna(linha, cabecalho, "LOCAL"),
      reporter: coluna(linha, cabecalho, "REPÓRTER"),
      afiliada: coluna(linha, cabecalho, "AFILIADA / EMISSORA"),
    });
    if (registro) registros.push(registro);
  }
  return registros;
}

async function carregarMateriasNaoExibidas() {
  const registros = [];
  const [cabecalho = [], ...linhas] =
    await ler(PLANILHAS.naoExibidas, `'${ABA_NAO_EXIBIDAS}'!A1:E`);

  for (const linha of linhas) {
    const registro = registroBase({
      tipo: "cobertura",
      origem: "MATÉRIAS QUE NÃO FORAM AO AR",
      aba: ABA_NAO_EXIBIDAS,
      data: coluna(linha, cabecalho, "RECEBIDO EM"),
      id: coluna(linha, cabecalho, "ID"),
      reporter: coluna(linha, cabecalho, "REPÓRTER"),
      afiliada: coluna(linha, cabecalho, "FILIADA", "AFILIADA"),
      descricao: coluna(linha, cabecalho, "MATÉRIAS", "MATERIAS"),
      formatoData: "mdy",
    });
    if (registro) registros.push(registro);
  }
  return registros;
}

function ordenarMaisNovo(a, b) {
  return b._timestamp - a._timestamp || a.descricao.localeCompare(b.descricao, "pt-BR");
}

function limparInternos(registro) {
  const { _timestamp, ...publico } = registro;
  return publico;
}

async function main() {
  const [vtsFonte, noticiasFonte, imagensFonte, naoExibidasFonte, fonteAgroFonte] = await Promise.all([
    tentarCarregar("VTs", carregarVts),
    tentarCarregar("Notícias/stand-ups", carregarNoticias),
    tentarCarregar("Imagens de cobertura", carregarImagensCobertura),
    tentarCarregar("Matérias não exibidas", carregarMateriasNaoExibidas),
    tentarCarregar("fonte_agrocultura", carregarFonteAgrocultura),
  ]);

  const falhasFontes = [
    ["VTs", vtsFonte.erro],
    ["Notícias/stand-ups", noticiasFonte.erro],
    ["Imagens de cobertura", imagensFonte.erro],
    ["Matérias não exibidas", naoExibidasFonte.erro],
    ["fonte_agrocultura", fonteAgroFonte.erro],
  ].filter(([, erro]) => erro);

  if (falhasFontes.length) {
    const detalhes = falhasFontes
      .map(([rotulo, erro]) => `${rotulo}: ${erro}`)
      .join(" | ");
    throw new Error(
      `Snapshot AgroCultura não publicado porque uma ou mais fontes falharam. ${detalhes}`
    );
  }

  const { vts, noticias, coberturas, removidosDaCobertura } = classificarAcervoAgrocultura({
    vts: vtsFonte.registros,
    noticias: noticiasFonte.registros,
    coberturas: [...fonteAgroFonte.registros, ...imagensFonte.registros, ...naoExibidasFonte.registros],
  });

  if (!vts.length && !noticias.length && !coberturas.length) {
    throw new Error("Nenhuma fonte do AgroCultura pôde ser lida. Verifique as permissões da conta de serviço.");
  }

  vts.sort(ordenarMaisNovo);
  noticias.sort(ordenarMaisNovo);
  coberturas.sort(ordenarMaisNovo);

  const todosIds = new Set([...vts, ...noticias, ...coberturas].flatMap((r) => r.ids));

  const payload = {
    generatedAt: new Date().toISOString(),
    parcial: false,
    errosFontes: {
      vts: vtsFonte.erro,
      noticias: noticiasFonte.erro,
      imagens: imagensFonte.erro,
      naoExibidas: naoExibidasFonte.erro,
      fonteAgrocultura: fonteAgroFonte.erro,
    },
    fontes: {
      vts: [
        "MATÉRIAS QUE FORAM AO AR_ / 2019-2026",
        "MATÉRIAS QUE FORAM AO AR_ / VTS FAUSTINO",
        "imgs / LOCAL por Media ID",
      ],
      noticias: ["NOTÍCIAS E OUTRAS NOTÍCIAS QUE FORAM AO AR"],
      coberturas: ["fonte_agrocultura", "IMAGENS AGROCULTURA 15.07.2026", "MATÉRIAS QUE NÃO FORAM AO AR"],
    },
    resumo: {
      materiais: todosIds.size,
      vts: new Set(vts.flatMap((r) => r.ids)).size,
      noticias: new Set(noticias.flatMap((r) => r.ids)).size,
      coberturas: new Set(coberturas.flatMap((r) => r.ids)).size,
      coberturaDuplicadosExcluidos: removidosDaCobertura,
    },
    vts: vts.map(limparInternos),
    noticias: noticias.map(limparInternos),
    coberturas: coberturas.map(limparInternos),
  };

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/agrocultura-acervo.json", `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`AgroCultura: ${payload.resumo.materiais} IDs únicos.`);
  console.log(`VTs: ${payload.resumo.vts}; notícias: ${payload.resumo.noticias}; coberturas: ${payload.resumo.coberturas}; excluídos da cobertura: ${removidosDaCobertura}.`);
}

main().catch((erro) => {
  console.error("Erro ao gerar acervo do AgroCultura:", erro);
  process.exitCode = 1;
});
