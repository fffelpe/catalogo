import fs from "node:fs/promises";
import process from "node:process";
import { avaliarFrescorSnapshot } from "./snapshot-freshness.mjs";

const arquivo = process.argv[2] || "data/catalogo-acervo.json";
const limiteMinutos = Number(process.env.SNAPSHOT_MAX_AGE_MINUTES || 20);

async function main() {
  let snapshot;

  try {
    snapshot = JSON.parse(await fs.readFile(arquivo, "utf8"));
  } catch (erro) {
    console.error(`ERRO: não foi possível ler ${arquivo}: ${erro.message}`);
    process.exitCode = 1;
    return;
  }

  const resultado = avaliarFrescorSnapshot(snapshot, { limiteMinutos });

  if (resultado.ultimaSincronizacao) {
    console.log(`Última sincronização bem-sucedida: ${resultado.ultimaSincronizacao}`);
  }

  if (Number.isFinite(resultado.idadeMinutos)) {
    console.log(`Idade do snapshot: ${resultado.idadeMinutos} minuto(s)`);
  }

  console.log(`Limite permitido: ${limiteMinutos} minuto(s)`);

  if (!resultado.ok) {
    console.error(`ERRO: ${resultado.motivo}`);
    process.exitCode = 1;
    return;
  }

  console.log("Snapshot atualizado.");
}

main();
