import fs from "node:fs/promises";
import process from "node:process";
import { google } from "googleapis";
import { extrairMediaIds } from "./media-id.mjs";

const PLANILHAS = {
  vts: "1Ny0gjt-4du7cJ-ejgahfhdplnCBl58d6RV7kfuLjKM0",
  noticias: "1LIkpJyIxTV7o4Zz1uJ90ZZTDfedTNsihfJB14CsewRw",
  imagens: "1M4ZVI_ax1ziVttl87FxFC0xxs7zRtVhj9yoIFFUb1aI",
  naoExibidas: "1snKWDdgFQ1T-AXdEU6Hof9V2B56v5qkQKfUjrzobtGU",
};

const ABAS_VTS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const ABA_FAUSTINO = "VTS FAUSTINO";
const ABA_NOTICIAS = "NOTÍCIAS E OUTRAS NOTÍCIAS QUE ";
const ABA_IMAGENS = "Página1";
const ABA_NAO_EXIBIDAS = "MATÉRIAS QUE NÃO FORAM AO AR";

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

async function tentarCarregar(rotulo, funcao) {
  try {
    const registros = await funcao();
    console.log(`${rotulo}: ${registros.length} registros carregados.`);
    return { registros, erro: null };
  } catch (erro) {
    const status = erro?.response?.status || erro?.code || "erro";
    console.warn(`${rotulo}: fonte indisponível (${status}). O restante do acervo continuará sendo gerado.`);
    return { registros: [], erro: String(erro?.message || erro) };
  }
}

function registroBase({ tipo, origem, aba, id, descricao, reporter, data, local, pgm, formatoData = "dmy" }) {
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
    _timestamp: dataParaTimestamp(data, formatoData),
  };
}

async function carregarVts() {
  const registros = [];

  for (const aba of ABAS_VTS) {
    const linhas = await ler(PLANILHAS.vts, `'${aba}'!A2:E`);
    for (const linha of linhas) {
      const registro = registroBase({
        tipo: "vt",
        origem: "MATÉRIAS QUE FORAM AO AR_",
        aba,
        pgm: linha[0],
        descricao: linha[1],
        reporter: linha[2],
        id: linha[3],
        data: linha[4],
        local: "",
      });
      if (registro) registros.push(registro);
    }
  }

  const faustino = await ler(PLANILHAS.vts, `'${ABA_FAUSTINO}'!A2:D`);
  for (const linha of faustino) {
    const registro = registroBase({
      tipo: "vt",
      origem: "MATÉRIAS QUE FORAM AO AR_",
      aba: ABA_FAUSTINO,
      pgm: linha[0],
      descricao: linha[1],
      reporter: "BRUNO FAUSTINO",
      id: linha[2],
      data: linha[3],
      local: "",
    });
    if (registro) registros.push(registro);
  }

  return registros;
}

async function carregarNoticias() {
  const linhas = await ler(PLANILHAS.noticias, `'${ABA_NOTICIAS.replaceAll("'", "''")}'!A2:I`);
  const registros = [];

  for (const linha of linhas) {
    const registro = registroBase({
      tipo: "noticias",
      origem: "NOTÍCIAS E OUTRAS NOTÍCIAS QUE FORAM AO AR",
      aba: ABA_NOTICIAS,
      pgm: linha[0],
      id: linha[1],
      data: linha[2],
      descricao: linha[3],
      local: linha[4],
      reporter: linha[5],
    });
    if (registro) registros.push(registro);
  }

  return registros;
}

async function carregarImagensCobertura() {
  const registros = [];
  const imagens = await ler(PLANILHAS.imagens, `'${ABA_IMAGENS}'!A2:D`);

  for (const linha of imagens) {
    const registro = registroBase({
      tipo: "cobertura",
      origem: "IMAGENS AGROCULTURA 15.07.2026",
      aba: ABA_IMAGENS,
      id: linha[0],
      data: linha[1],
      local: linha[2],
      descricao: linha[3],
      reporter: "",
      pgm: "",
    });
    if (registro) registros.push(registro);
  }

  return registros;
}

async function carregarMateriasNaoExibidas() {
  const registros = [];
  const linhas = await ler(PLANILHAS.naoExibidas, `'${ABA_NAO_EXIBIDAS}'!A2:E`);

  for (const linha of linhas) {
    const registro = registroBase({
      tipo: "cobertura",
      origem: "MATÉRIAS QUE NÃO FORAM AO AR",
      aba: ABA_NAO_EXIBIDAS,
      data: linha[0],
      id: linha[1],
      reporter: linha[2],
      local: "",
      descricao: linha[4],
      pgm: "",
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
  const [vtsFonte, noticiasFonte, imagensFonte, naoExibidasFonte] = await Promise.all([
    tentarCarregar("VTs", carregarVts),
    tentarCarregar("Notícias/stand-ups", carregarNoticias),
    tentarCarregar("Imagens de cobertura", carregarImagensCobertura),
    tentarCarregar("Matérias não exibidas", carregarMateriasNaoExibidas),
  ]);

  const vts = vtsFonte.registros;
  const noticias = noticiasFonte.registros;
  const coberturas = [...imagensFonte.registros, ...naoExibidasFonte.registros];

  if (!vts.length && !noticias.length && !coberturas.length) {
    throw new Error("Nenhuma fonte do AgroCultura pôde ser lida. Verifique as permissões da conta de serviço.");
  }

  vts.sort(ordenarMaisNovo);
  noticias.sort(ordenarMaisNovo);
  coberturas.sort(ordenarMaisNovo);

  const todosIds = new Set([...vts, ...noticias, ...coberturas].flatMap((r) => r.ids));

  const payload = {
    generatedAt: new Date().toISOString(),
    parcial: Boolean(vtsFonte.erro || noticiasFonte.erro || imagensFonte.erro || naoExibidasFonte.erro),
    errosFontes: {
      vts: vtsFonte.erro,
      noticias: noticiasFonte.erro,
      imagens: imagensFonte.erro,
      naoExibidas: naoExibidasFonte.erro,
    },
    fontes: {
      vts: ["MATÉRIAS QUE FORAM AO AR_ / 2019-2026", "MATÉRIAS QUE FORAM AO AR_ / VTS FAUSTINO"],
      noticias: ["NOTÍCIAS E OUTRAS NOTÍCIAS QUE FORAM AO AR"],
      coberturas: ["IMAGENS AGROCULTURA 15.07.2026", "MATÉRIAS QUE NÃO FORAM AO AR"],
    },
    resumo: {
      materiais: todosIds.size,
      vts: new Set(vts.flatMap((r) => r.ids)).size,
      noticias: new Set(noticias.flatMap((r) => r.ids)).size,
      coberturas: new Set(coberturas.flatMap((r) => r.ids)).size,
    },
    vts: vts.map(limparInternos),
    noticias: noticias.map(limparInternos),
    coberturas: coberturas.map(limparInternos),
  };

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/agrocultura-acervo.json", `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`AgroCultura: ${payload.resumo.materiais} IDs únicos.`);
  console.log(`VTs: ${payload.resumo.vts}; notícias/stand-ups: ${payload.resumo.noticias}; coberturas: ${payload.resumo.coberturas}.`);
  if (payload.parcial) console.warn("Acervo gerado parcialmente porque uma ou mais fontes estão sem permissão para a conta de serviço.");
}

main().catch((erro) => {
  console.error("Erro ao gerar acervo do AgroCultura:", erro);
  process.exitCode = 1;
});