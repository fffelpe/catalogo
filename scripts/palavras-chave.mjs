export function gerarEnriquecimentoRegistro() {
  return {
    keywords: [],
    manualKeywords: [],
    autoKeywords: [],
    subjects: [],
    people: [],
    places: [],
    segments: [],
  };
}

export function gerarEnriquecimentoCatalogo({ generatedAt } = {}) {
  return {
    schemaVersion: 1,
    generatedAt: generatedAt || new Date().toISOString(),
    items: {},
  };
}
