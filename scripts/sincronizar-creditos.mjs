import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { google } from "googleapis";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { normalizarMediaId } from "./media-id.mjs";

const PASTA_CREDITOS_ID = process.env.DRIVE_CREDITOS_FOLDER_ID || "1_9_olIPKl6qlQROGrILAU5Dz1pYYoRik";
const SAIDA = path.resolve("data/creditos.json");
const STATUS = path.resolve("data/creditos-status.json");

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
  return normalizarMediaId(String(nome || "").replace(/\.[^.]+$/, ""));
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

async function carregarRegistrosAnteriores() {
  try {
    return JSON.parse(await fs.readFile(SAIDA, "utf8"));
  } catch {
    return {};
  }
}

function ordenarMaisRecentes(arquivos) {
  return [...arquivos].sort((a, b) => {
    const ta = Date.parse(a.modifiedTime || "") || 0;
    const tb = Date.parse(b.modifiedTime || "") || 0;
    if (tb !== ta) return tb - ta;
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
  });
}

async function escreverStatus(dados) {
  await fs.mkdir(path.dirname(STATUS), { recursive: true });
  await fs.writeFile(STATUS, `${JSON.stringify(dados, null, 2)}\n`, "utf8");
}

async function main() {
  const arquivos = await listarArquivos();
  const anteriores = await carregarRegistrosAnteriores();
  const registros = {};
  const ignorados = [];
  const erros = [];
  const duplicados = [];
  const preservados = [];

  const grupos = new Map();
  for (const arquivo of arquivos) {
    const id = normalizarId(arquivo.name);
    if (!id) {
      ignorados.push({ nome: arquivo.name, motivo: "nome não corresponde ao padrão de Media ID (0000X00000 ou 0000X000000)" });
      continue;
    }
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(arquivo);
  }

  for (const [id, candidatosOriginais] of grupos.entries()) {
    const candidatos = ordenarMaisRecentes(candidatosOriginais);
    const falhasDoId = [];
    let escolhido = null;
    let textoEscolhido = "";

    for (const arquivo of candidatos) {
      try {
        const texto = await extrairTexto(arquivo);
        if (!texto.trim()) {
          falhasDoId.push({ nome: arquivo.name, erro: `sem texto extraível (${arquivo.mimeType})` });
          continue;
        }
        escolhido = arquivo;
        textoEscolhido = texto;
        break;
      } catch (erro) {
        falhasDoId.push({ nome: arquivo.name, erro: erro.message });
      }
    }

    if (candidatos.length > 1) {
      duplicados.push({
        id,
        escolhido: escolhido?.name || null,
        criterio: "primeiro arquivo legível, do mais recente para o mais antigo",
        arquivos: candidatos.map((item) => ({ nome: item.name, atualizadoEm: item.modifiedTime || "" }))
      });
    }

    falhasDoId.forEach((falha) => {
      erros.push({ id, ...falha });
      console.error(`Erro em ${falha.nome}:`, falha.erro);
    });

    if (escolhido) {
      registros[id] = {
        ...interpretarTexto(textoEscolhido),
        arquivo: {
          id: escolhido.id,
          nome: escolhido.name,
          mimeType: escolhido.mimeType,
          atualizadoEm: escolhido.modifiedTime || "",
          url: escolhido.webViewLink || `https://drive.google.com/open?id=${escolhido.id}`
        },
        origem: "Google Drive"
      };
      continue;
    }

    if (anteriores[id]) {
      registros[id] = anteriores[id];
      preservados.push({
        id,
        motivo: falhasDoId.length
          ? `todos os documentos atuais falharam; crédito anterior preservado`
          : "nenhum documento atual legível; crédito anterior preservado"
      });
    } else {
      ignorados.push({ nome: candidatos[0]?.name || id, motivo: "nenhuma versão legível do documento" });
    }
  }

  if (!Object.keys(registros).length) {
    throw new Error("Nenhum crédito válido foi extraído e não havia registros anteriores para preservar.");
  }

  await fs.mkdir(path.dirname(SAIDA), { recursive: true });
  await fs.writeFile(SAIDA, `${JSON.stringify(registros, null, 2)}\n`, "utf8");

  const status = {
    sincronizadoEm: new Date().toISOString(),
    pastaDrive: PASTA_CREDITOS_ID,
    totalArquivos: arquivos.length,
    totalIdsDetectados: grupos.size,
    totalSincronizados: Object.keys(registros).length,
    totalIgnorados: ignorados.length,
    totalErros: erros.length,
    totalDuplicados: duplicados.length,
    totalPreservados: preservados.length,
    ignorados,
    duplicados,
    preservados,
    erros
  };
  await escreverStatus(status);

  console.log(`Créditos disponíveis: ${Object.keys(registros).length}/${grupos.size} Media IDs.`);
  if (duplicados.length) console.warn(`IDs com documentos duplicados: ${duplicados.length}.`);
  if (preservados.length) console.warn(`Créditos anteriores preservados: ${preservados.length}.`);
  if (erros.length) console.warn(`Tentativas de leitura com erro: ${erros.length}.`);
}

main().catch((erro) => {
  console.error("Falha na sincronização:", erro.message);
  process.exitCode = 1;
});