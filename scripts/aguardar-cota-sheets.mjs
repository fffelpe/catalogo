import process from "node:process";

const PADRAO_COOLDOWN_MS = 65000;

function calcularCooldownMs(valor = process.env.SHEETS_SYNC_COOLDOWN_MS) {
  if (valor === undefined || valor === null || valor === "") return PADRAO_COOLDOWN_MS;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : PADRAO_COOLDOWN_MS;
}

async function aguardarCooldown(ms = calcularCooldownMs()) {
  if (ms <= 0) return;
  console.log(`Aguardando ${Math.ceil(ms / 1000)}s para renovar a cota de leitura do Google Sheets...`);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await aguardarCooldown();
}

export { PADRAO_COOLDOWN_MS, calcularCooldownMs, aguardarCooldown };
