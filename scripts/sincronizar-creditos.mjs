import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { google } from "googleapis";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const PASTA_CREDITOS_ID = process.env.DRIVE_CREDITOS_FOLDER_ID || "1_9_olIPKl6qlQROGrILAU5Dz1pYYoRik";
const SAIDA = path.resolve("data/creditos.json");
const STATUS = path.resolve("data/creditos-status.json");
const MEDIA_ID_RE = /^\d{4}B\d{6}$/i;

const credenciaisJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!credenciaisJson) throw new Error("Secret GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");

let credentials;
try {
  credentials = JSON.parse(credenciaisJson);
} catch {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não contém um JSON válido.");
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"]
});
const drive = google.drive({ version: "v3", auth });

function normalizarId(nome) {
  const id = String(nome || "")
    .replace(/\.[^.]+$/, "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
  return MEDIA_ID_RE.test(id) ? id : "";
}

function limparLinhas(texto) {
  return String(texto || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const CAMPOS = [
  { re: /^(?:roteiro\s*e\s*produ[cç][aã]o|roteiro\s*\/\s*produ[cç][aã]o)\s*[:\-]\s*(.+)$/i, chave: "roteiroProducao" },
  { re: /^produ[cç][aã]o\s*[:\-]\s*(.+)$/i, chave: "producao" },
  { re: /^reportagem\s*[:\-]\s*(.+)$/i, chave: "reportagem" },
  { re: /^(?:imagens|cinegrafia|cinegrafista)\s*[:\-]\s*(.+)$/i, chave: "imagens" },
  { re: /^(?:c[aâ]mera|camera)\s*[:\-]\s*(.+)$/i, chave: "camera" },
  { re: /^drone\s*[:\-]\s*(.+)$/i, chave: "drone" },
  { re: /^(?:edi[cç][aã]o|editor)\s*[:\-]\s*(.+)$/i, chave: "edicao" },
  { re: /^arte\s*[:\-]\s*(.+)$/i, chave: "arte" },
  { re: /^finaliza[cç][aã]o\s*[:\-]\s*(.+)$/i, chave: "finalizacao" },
  { re: /^(?:texto|reda[cç][aã]o)\s*[:\-]\s*(.+)$/i, chave: "texto" },
  { re: /^narra[cç][aã]o\s*[:\-]\s*(.+)$/i, chave: "narracao" }
];

function interpretarTexto(texto) {
  const linhas = limparLinhas(texto);
  const creditos = {};
  const consumidas = new Set();
  const fontes = [];

  let materia = "";
  if (linhas.length) {
    materia = linhas[0].replace(/^mat[eé]ria\s*\d*\s*[-–—:]?\s*/i, "").trim();
    consumidas.add(0);
  }

  linhas.forEach((linha, indice) => {
    const creditoSemDoisPontos = linha.match(/^cr[eé]ditos?\s+(.+)$/i);
    if (creditoSemDoisPontos) {
      creditos.credito = creditoSemDoisPontos[1].trim();
      consumidas.add(indice);
      return;
    }

    const creditoComDoisPontos = linha.match(/^cr[eé]ditos?\s*[:\-]\s*(.+)$/i);
    if (creditoComDoisPontos) {
      creditos.credito = creditoComDoisPontos[1].trim();
      consumidas.add(indice);
      return;
    }

    for (const campo of CAMPOS) {
      const match = linha.match(campo.re);
      if (!match) continue;
      creditos[campo.chave] = match[1].trim();
      consumidas.add(indice);
      break;
    }
  });

  const candidatosFonte = linhas
    .map((linha, indice) => ({ linha, indice }))
    .filter(({ indice }) => !consumidas.has(indice))
    .filter(({ linha }) => !/^cr[eé]ditos?\b/i.test(linha))
    .filter(({ linha }) => !linha.includes(":"));

  for (let i = 0; i < candidatosFonte.length; i += 2) {
    const nome = candidatosFonte[i]?.linha || "";
    const cargo = candidatosFonte[i + 1]?.linha || "";
    if (nome) fontes.push({ nome, ...(cargo ? { cargo } : {}) });
  }

  return { materia, fontes, creditos, textoCompleto: linhas.join(" | ") };
}

async function listarArquivos() {
  const arquivos = [];
  let pageToken;
  do {
    const resposta = await drive.files.list({
      q: `'${PASTA_CREDITOS_ID}' in parents and trashed = false`,
      fields: "nextPageToken, files(id,name,mimeType,modifiedTime,webViewLink,size)",
      pageSize: 1000,
      pageToken
    });
    arquivos.push(...(resposta.data.files || []));
    pageToken = resposta.data.nextPageToken || undefined;
  } while (pageToken);
  return arquivos;
}

async function baixarArquivo(arquivo) {
  const resposta = await drive.files.get(
    { fileId: arquivo.id, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(resposta.data);
}

async function extrairTexto(arquivo) {
  if (arquivo.mimeType === "application/vnd.google-apps.document") {
    const resposta = await drive.files.export(
      { fileId: arquivo.id, mimeType: "text/plain" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(resposta.data).toString("utf8");
  }

  if (arquivo.mimeType === "application/pdf") {
    const resultado = await pdfParse(await baixarArquivo(arquivo));
    return resultado.text || "";
  }

  if (arquivo.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const resultado = await mammoth.extractRawText({ buffer: await baixarArquivo(arquivo) });
    return resultado.value || "";
  }

  return "";
}

async function escreverStatus(dados) {
  await fs.mkdir(path.dirname(STATUS), { recursive: true });
  await fs.writeFile(STATUS, `${JSON.stringify(dados, null, 2)}\n`, "utf8");
}

async function main() {
  const arquivos = await listarArquivos();
  const registros = {};
  const arquivoPorId = new Map();
  const ignorados = [];
  const erros = [];
  const duplicados = [];

  for (const arquivo of arquivos) {
    const id = normalizarId(arquivo.name);
    if (!id) {
      ignorados.push({ nome: arquivo.name, motivo: "nome não corresponde ao padrão de Media ID (0000B000000)" });
      continue;
    }

    if (arquivoPorId.has(id)) {
      duplicados.push({ id, arquivos: [arquivoPorId.get(id), arquivo.name] });
      continue;
    }
    arquivoPorId.set(id, arquivo.name);

    try {
      const texto = await extrairTexto(arquivo);
      if (!texto.trim()) {
        ignorados.push({ nome: arquivo.name, motivo: `formato sem extração de texto (${arquivo.mimeType})` });
        continue;
      }

      registros[id] = {
        ...interpretarTexto(texto),
        arquivo: {
          id: arquivo.id,
          nome: arquivo.name,
          mimeType: arquivo.mimeType,
          atualizadoEm: arquivo.modifiedTime || "",
          url: arquivo.webViewLink || `https://drive.google.com/open?id=${arquivo.id}`
        },
        origem: "Google Drive"
      };
    } catch (erro) {
      erros.push({ nome: arquivo.name, id, erro: erro.message });
      console.error(`Erro em ${arquivo.name}:`, erro.message);
    }
  }

  const status = {
    sincronizadoEm: new Date().toISOString(),
    pastaDrive: PASTA_CREDITOS_ID,
    totalArquivos: arquivos.length,
    totalSincronizados: Object.keys(registros).length,
    totalIgnorados: ignorados.length,
    totalErros: erros.length,
    totalDuplicados: duplicados.length,
    ignorados,
    duplicados,
    erros
  };
  await escreverStatus(status);

  if (duplicados.length) {
    throw new Error(`Há ${duplicados.length} Media ID(s) com mais de um documento na pasta de créditos. O creditos.json foi preservado.`);
  }
  if (erros.length) {
    throw new Error(`Falha ao processar ${erros.length} documento(s). O creditos.json foi preservado.`);
  }
  if (!Object.keys(registros).length) {
    throw new Error("Nenhum crédito válido foi extraído; o JSON existente foi preservado.");
  }

  await fs.mkdir(path.dirname(SAIDA), { recursive: true });
  await fs.writeFile(SAIDA, `${JSON.stringify(registros, null, 2)}\n`, "utf8");
  console.log(`Créditos sincronizados: ${Object.keys(registros).length}/${arquivos.length}`);
}

main().catch((erro) => {
  console.error("Falha na sincronização:", erro.message);
  process.exitCode = 1;
});
