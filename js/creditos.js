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
      .replace(/\s+/g, "")
      .toUpperCase();
  },

  separarIds(valor) {
    return String(valor || "")
      .split(/[\r\n,;]+/)
      .map((id) => this.normalizarId(id))
      .filter(Boolean);
  },

  obter(id) {
    return this.registros[this.normalizarId(id)] || null;
  },

  obterVarios(ids = []) {
    return ids
      .map((id) => ({ id: this.normalizarId(id), dados: this.obter(id) }))
      .filter((item) => item.id && item.dados);
  },

  obterPorValorIds(valor) {
    return this.obterVarios(this.separarIds(valor));
  },

  camposPesquisa(valorIds) {
    const encontrados = this.obterPorValorIds(valorIds);
    const materias = [];
    const fontes = [];
    const cargos = [];
    const equipe = [];

    encontrados.forEach(({ dados }) => {
      if (dados.materia) materias.push(dados.materia);

      const listaFontes = Array.isArray(dados.fontes) ? dados.fontes : [];
      listaFontes.forEach((fonte) => {
        if (fonte?.nome) fontes.push(fonte.nome);
        if (fonte?.cargo) cargos.push(fonte.cargo);
      });

      Object.values(dados.creditos || {}).forEach((valor) => {
        if (Array.isArray(valor)) equipe.push(...valor.filter(Boolean));
        else if (valor) equipe.push(valor);
      });
    });

    return {
      CREDITOS_MATERIA: materias.join(" "),
      CREDITOS_FONTES: fontes.join(" "),
      CREDITOS_CARGOS: cargos.join(" "),
      CREDITOS_EQUIPE: equipe.join(" ")
    };
  }
};