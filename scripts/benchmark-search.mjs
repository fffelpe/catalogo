import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { performance } from "node:perf_hooks";

const repo = path.resolve(process.argv[2] || process.cwd());
const label = process.argv[3] || path.basename(repo);

const QUERIES = [
  "1452B005350",
  "são paulo",
  "economia",
  "chuva",
  "saúde",
  "agricultura",
  "bruno faustino",
  "meio ambiente"
];
const ROUNDS = Number(process.env.BENCH_ROUNDS || 2);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repo, file), "utf8"));
}

function loadScript(sandbox, file, exposeName = null) {
  const code = fs.readFileSync(path.join(repo, file), "utf8");
  const suffix = exposeName ? `\nglobalThis.${exposeName} = ${exposeName};` : "";
  vm.runInContext(code + suffix, sandbox, { filename: file });
}

function recordsFromSnapshot(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.registros)) return payload.registros;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const catalog = readJson("data/catalogo-acervo.json");
const enrichment = readJson("data/media-enrichment.json");
const credits = readJson("data/creditos.json");
const records = recordsFromSnapshot(catalog);

function createSearchContext() {
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    URL,
    fetch: async () => ({ ok: false, json: async () => ({}) })
  };
  vm.createContext(sandbox);
  loadScript(sandbox, "js/media-id.js", "MediaIdUtils");
  loadScript(sandbox, "js/sinonimos.js", "VocabularioJornalistico");
  loadScript(sandbox, "js/media-enrichment.js", "MediaEnrichment");
  sandbox.MediaEnrichment._definirParaTeste(enrichment.items || {});
  loadScript(sandbox, "js/media-segments.js", "MediaSegments");
  loadScript(sandbox, "js/creditos.js", "CreditosMedia");
  sandbox.CreditosMedia.registros = credits && typeof credits === "object" ? credits : {};
  sandbox.CreditosMedia.carregado = true;
  loadScript(sandbox, "js/search-engine.js", "SearchEngine");
  return sandbox.SearchEngine;
}

function timedSearch(engine, query) {
  const start = performance.now();
  const result = engine.pesquisar(records, query);
  return { ms: performance.now() - start, count: result.length };
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    avgMs: avg,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    minMs: sorted[0],
    maxMs: sorted.at(-1)
  };
}

// Mede uma primeira busca representativa com o catálogo já carregado.
const coldEngine = createSearchContext();
const cold = { query: "são paulo", ...timedSearch(coldEngine, "são paulo") };

// Mede uso normal da página: motor carregado, uma passagem de aquecimento e pesquisas seguintes.
const engine = createSearchContext();
for (const query of QUERIES) timedSearch(engine, query);

const samples = new Map(QUERIES.map((q) => [q, []]));
const counts = new Map();
for (let round = 0; round < ROUNDS; round += 1) {
  for (const query of QUERIES) {
    const measured = timedSearch(engine, query);
    samples.get(query).push(measured.ms);
    counts.set(query, measured.count);
  }
}

const warm = QUERIES.map((query) => ({
  query,
  count: counts.get(query),
  ...stats(samples.get(query))
}));

const output = {
  label,
  records: records.length,
  rounds: ROUNDS,
  cold,
  warm,
  overallWarm: stats([...samples.values()].flat())
};

console.log("BENCHMARK_JSON=" + JSON.stringify(output));
