// Compacta dados no diretório temporário do Pages sem alterar os fontes versionados.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function otimizarJsonPublicacao(diretorio) {
  const entradas = await fs.readdir(diretorio, { withFileTypes: true });
  const arquivos = entradas.filter((entrada) => entrada.isFile() && entrada.name.endsWith(".json"));
  let bytesOriginais = 0;
  let bytesCompactados = 0;

  for (const arquivo of arquivos) {
    const caminho = path.join(diretorio, arquivo.name);
    const original = await fs.readFile(caminho, "utf8");
    const dados = JSON.parse(original);
    if (!dados || typeof dados !== "object") {
      throw new Error(`Arquivo JSON inválido para o catálogo: ${caminho}`);
    }
    const compacto = JSON.stringify(dados);
    await fs.writeFile(caminho, compacto, "utf8");
    bytesOriginais += Buffer.byteLength(original);
    bytesCompactados += Buffer.byteLength(compacto);
  }

  console.log(`JSON publicados: ${arquivos.length}; bytes: ${bytesOriginais} -> ${bytesCompactados}.`);
  return { arquivos: arquivos.length, bytesOriginais, bytesCompactados };
}

const executadoDiretamente = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  await otimizarJsonPublicacao(process.argv[2] || ".pages-dist/data");
}
