import fs from "node:fs/promises";
import { gerarEnriquecimentoCatalogo } from "./palavras-chave.mjs";

const CAMINHOS = {
  catalogo: "data/catalogo-acervo.json",
  creditos: "data/creditos.json",
  anterior: "data/media-enrichment.json",
  afiliadas: "data/afiliadas-reporteres.json",
  saida: "data/media-enrichment.json",
};

async function lerJson(caminho, fallback) {
  try {
    return JSON.parse(await fs.readFile(caminho, "utf8"));
  } catch (erro) {
    if (erro?.code === "ENOENT") return fallback;
    throw erro;
  }
}

async function main() {
  const [catalogo, creditos, anterior, afiliadas] = await Promise.all([
    lerJson(CAMINHOS.catalogo, { registros: [] }),
    lerJson(CAMINHOS.creditos, {}),
    lerJson(CAMINHOS.anterior, { schemaVersion: 1, items: {} }),
    lerJson(CAMINHOS.afiliadas, { afiliadas: [], reporteres: [] }),
  ]);

  const registros = Array.isArray(catalogo?.registros) ? catalogo.registros : [];
  if (!registros.length) {
    throw new Error("Catálogo principal sem registros; geração de palavras-chave cancelada.");
  }

  const snapshot = gerarEnriquecimentoCatalogo({
    registros,
    creditos,
    anterior,
    afiliadas,
  });

  const itens = Object.values(snapshot.items);
  const totalKeywords = itens.reduce((soma, item) => soma + (item.autoKeywords?.length || 0), 0);
  const comOitoOuMais = itens.filter((item) => (item.autoKeywords?.length || 0) >= 8).length;

  await fs.writeFile(CAMINHOS.saida, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(
    `Enriquecimento: ${itens.length} Media ID(s), ${totalKeywords} palavra(s)-chave automática(s), ` +
    `${comOitoOuMais} registro(s) com pelo menos 8 termos.`
  );
}

main().catch((erro) => {
  console.error("Erro ao gerar palavras-chave do catálogo:", erro);
  process.exitCode = 1;
});
