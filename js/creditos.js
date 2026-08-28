// creditos.js - Carrega os metadados de créditos relacionados aos Media IDs.

const CreditosMedia = {
  registros: {},
  carregado: false,
  JSON_URL: "../data/creditos.json",

  async carregar() {
    if (this.carregado) return this.registros;

    const resposta = await fetch(this.JSON_URL, { cache: "no-store" });
    if (!resposta.ok) {
      throw new Error(`Não foi possível carregar os créditos (${resposta.status}).`);
    }

    const dados = await resposta.json();
    this.registros = dados && typeof dados === "object" ? dados : {};
    this.carregado = true;
    return this.registros;
  },

  normalizarId(valor) {
    return String(valor || "")
      .trim()
      .replace(/\.mp4$/i, "")
      .toUpperCase();
  },

  obter(id) {
    return this.registros[this.normalizarId(id)] || null;
  },

  obterVarios(ids = []) {
    return ids
      .map((id) => ({ id: this.normalizarId(id), dados: this.obter(id) }))
      .filter((item) => item.id && item.dados);
  }
};
