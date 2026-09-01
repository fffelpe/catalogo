// dados.js - Carrega e gerencia os dados da planilha do Google Sheets (imgs.csv)

const DadosMedia = {
  registros: [],
  carregado: false,
  CSV_URL: "https://docs.google.com/spreadsheets/d/1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs/export?format=csv&gid=0",

  async carregarCSV() {
    if (this.carregado) return this.registros;

    return new Promise((resolve, reject) => {
      Papa.parse(this.CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.registros = results.data
            .map(this._normalizar)
            .sort(this._compararPorDataDesc);
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
      EDITORIA: mapa["EDITORIA"] || "",
      PGM: mapa["PGM"] || ""
    };
  },

  _parseData(dataStr) {
    if (!dataStr) return null;
    const str = dataStr.trim();

    let m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      let [, d, mo, y] = m;
      if (y.length === 2) y = (Number(y) < 50 ? "20" : "19") + y;
      const date = new Date(Number(y), Number(mo) - 1, Number(d));
      if (!isNaN(date.getTime())) return date;
    }

    m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const [, y, mo, d] = m;
      const date = new Date(Number(y), Number(mo) - 1, Number(d));
      if (!isNaN(date.getTime())) return date;
    }

    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  },

  _compararPorDataDesc(a, b) {
    const da = DadosMedia._parseData(a.DATA);
    const db = DadosMedia._parseData(b.DATA);
    if (da && db) return db - da;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return 0;
  },

  buscar(termo) {
    if (!termo) return this.registros;
    const q = termo.toLowerCase();
    return this.registros.filter((r) =>
      Object.values(r).some((v) => v.toLowerCase().includes(q))
    );
  },

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
