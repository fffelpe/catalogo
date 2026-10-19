// Projeção compacta usada na pesquisa; preserva metadados editoriais completos em media-enrichment.json.
export function gerarIndiceBuscaEnriquecimento(snapshot = {}) {
  if (snapshot.schemaVersion !== 1 || !snapshot.items || typeof snapshot.items !== "object" || Array.isArray(snapshot.items)) {
    throw new Error("Snapshot de enriquecimento inválido.");
  }
  const items = {};
  for (const [id, item] of Object.entries(snapshot.items)) {
    items[id] = [
      item.title || "", item.keywords || [], item.subjects || [],
      item.people || [], item.places || [], item.organizations || [], item.segments || []
    ];
  }
  return { schemaVersion: 1, generatedAt: snapshot.generatedAt, items };
}
