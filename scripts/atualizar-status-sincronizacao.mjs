import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A verificação é registrada por hora para evitar commits e deploys a cada execução sem mudança editorial.
// generatedAt do snapshot estabilizado representa a alteração de CONTEÚDO, não a última leitura das planilhas.
export function construirStatusSincronizacao(snapshot, agora = new Date()) {
  if (!snapshot || !Array.isArray(snapshot.registros) || !Number.isInteger(snapshot.total) || snapshot.total !== snapshot.registros.length) {
    throw new Error("Snapshot inconsistente ao atualizar status da sincronização.");
  }
  const modificado = Date.parse(snapshot.generatedAt);
  const verificado = new Date(agora);
  if (!Number.isFinite(modificado) || !Number.isFinite(verificado.getTime())) throw new Error("Datas inválidas no status.");
  return {
    schemaVersion: 1,
    ultimaVerificacaoFaixaUTC: new Date(Math.floor(verificado.getTime() / 3_600_000) * 3_600_000).toISOString(),
    ultimoAcervoAtualizadoEm: new Date(modificado).toISOString(),
    registros: snapshot.total,
    precisaoVerificacao: "hora",
  };
}

async function main() {
  const snapshot = JSON.parse(await fs.readFile("data/catalogo-acervo.json", "utf8"));
  const status = construirStatusSincronizacao(snapshot);
  const destino = "data/sincronizacao-status.json";
  const anterior = await fs.readFile(destino, "utf8").catch((erro) => {
    if (erro.code === "ENOENT") return null;
    throw erro;
  });
  const conteudo = JSON.stringify(status, null, 2) + "\n";
  if (anterior === conteudo) {
    console.log("Status de sincronização sem alterações nesta hora.");
    return;
  }
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, conteudo, "utf8");
  console.log(`Status: verificação na hora ${status.ultimaVerificacaoFaixaUTC}, conteúdo desde ${status.ultimoAcervoAtualizadoEm}.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((erro) => { console.error(erro); process.exitCode = 1; });
}
