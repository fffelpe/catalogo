// dados.js - Carrega e gerencia os dados da planilha do Google Sheets (imgs.csv)

const DadosMedia = {
  registros: [],
  carregado: false,

  // URL de exportação em CSV da planilha "imgs" (compartilhada como "Qualquer pessoa com o link pode ver").
  // Padrão: /spreadsheets/d/ID_DA_PLANILHA/export?format=csv&gid=ID_DA_ABA
  CSV_URL: "https://docs.google.com/spreadsheets/d/1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs/export?format=csv&gid=0",

  async carregarCSV() {
    if (this.carregado) return this.registros;

    return new Promise((resolve, reject) => {
      Papa.parse(this.CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.registros = results.data.map(this._normalizar);
          this.carregado = true;
          resolve(this.registros);
        },
        error: (err) => {
          console.error("Erro ao carregar a planilha:", err);
          reject(err);
        }
      });
    });
  },

  // Normaliza cada linha para nomes de campo fixos, tolerando cabeçalhos com
  // espaços extras, maiúsculas/minúsculas diferentes ou pequenas variações de acentuação.
  // Colunas reais da planilha "imgs": ID, DESCRIÇÃO, DATA, LOCAL, REPÓRTER,
  // AFILIADA / EMISSORA (uma coluna só), PROGRAMA, EDITORIA.
  _normalizar(item) {
    const mapa = {};
    Object.keys(item).forEach((chaveOriginal) => {
      const chave = chaveOriginal.trim().toUpperCase();
      mapa[chave] = (item[chaveOriginal] || "").toString().trim();
    });

    const chaveAfiliada = Object.keys(mapa).find((k) => k.includes("AFILIADA"));

    return {
      ID: mapa["ID"] || "",
      DESCRICAO: mapa["DESCRIÇÃO"] || mapa["DESCRICAO"] || "",
      DATA: mapa["DATA"] || "",
      LOCAL: mapa["LOCAL"] || "",
      REPORTER: mapa["REPÓRTER"] || mapa["REPORTER"] || "",
      AFILIADA_EMISSORA: chaveAfiliada ? mapa[chaveAfiliada] : "",
      PROGRAMA: mapa["PROGRAMA"] || "",
      EDITORIA: mapa["EDITORIA"] || ""
    };
  },

  // Busca livre em todas as colunas
  buscar(termo) {
    if (!termo) return this.registros;
    const q = termo.toLowerCase();
    return this.registros.filter((r) =>
      Object.values(r).some((v) => v.toLowerCase().includes(q))
    );
  },

  // Filtra por programa (nome exato ou parcial) e, opcionalmente, por um termo adicional
  buscarPorPrograma(programaNome, termo) {
    let base = this.registros;

    if (programaNome) {
      const p = decodeURIComponent(programaNome).toLowerCase().trim();
      base = base.filter((r) => r.PROGRAMA.toLowerCase().includes(p));
    }

    if (!termo) return base;

    const q = termo.toLowerCase();
    return base.filter((r) =>
      Object.values(r).some((v) => v.toLowerCase().includes(q))
    );
  }
};