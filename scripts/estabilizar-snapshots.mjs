// Evita commits quando uma sincronização só modificou campos de horário.
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CAMPOS_VOLATEIS = ["generatedAt", "sincronizadoEm"];

export function conteudoEquivalente(atual, anterior, campos = CAMPOS_VOLATEIS) {
  if (!atual || !anterior || typeof atual !== "object" || typeof anterior !== "object") {
    return false;
  }
  const semHorarios = (objeto) => Object.fromEntries(
    Object.entries(objeto).filter(([chave]) => !campos.includes(chave))
  );
  return JSON.stringify(semHorarios(atual)) === JSON.stringify(semHorarios(anterior));
}

export async function estabilizarArquivo(arquivo) {
  const caminho = path.relative(process.cwd(), path.resolve(arquivo)).replaceAll(path.sep, "/");
  const textoNovo = await fs.readFile(caminho, "utf8");
  const atual = JSON.parse(textoNovo);
  let textoAnterior;
  try {
    textoAnterior = execFileSync("git", ["show", `HEAD:${caminho}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024
    });
  } catch {
    console.log(`${caminho}: sem versão anterior, mantendo o arquivo gerado.`);
    return false;
  }

  if (!conteudoEquivalente(atual, JSON.parse(textoAnterior))) return false;
  if (textoNovo !== textoAnterior) {
    await fs.writeFile(caminho, textoAnterior, "utf8");
    console.log(`${caminho}: sem alterações editoriais, preservado o arquivo anterior.`);
  }
  return true;
}

const executadoDiretamente = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  const arquivos = process.argv.slice(2);
  if (!arquivos.length) {
    console.error("Informe os arquivos JSON para comparar.");
    process.exitCode = 1;
  } else {
    for (const arquivo of arquivos) await estabilizarArquivo(arquivo);
  }
}
