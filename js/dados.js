// dados.js - Carrega e gerencia o acervo principal do catálogo.
// Fonte primária: snapshot JSON versionado no próprio GitHub Pages.
// Fallback temporário: CSV público do Google Sheets.

const DadosMedia = {
  registros: [],
  registrosOrdemInsercao: [],
  carregado: false,
  _carregamentoPromise: null,
  CSV_URL: "https://docs.google.com/spreadsheets/d/1EUIj1PImhdTY78Vt3Kw-ASx3RenEZGZ__1NpPpWrRNs/export?format=csv&gid=0",
  SNAPSHOT_URL: (() => {
    const scriptSrc = typeof document !== "undefined" ? document.currentScript?.src : "";
    if (scriptSrc) {
      return new URL("../data/catalogo-acervo.json", scriptSrc).href;
    }

    if (typeof window !== "undefined" && window.location?.href) {
      const caminho = window.location.pathname.includes("/pages/")
        ? "../data/catalogo-acervo.json"
        : "data/catalogo-acervo.json";
      return new URL(caminho, window.location.href).href;
    }

    return "data/catalogo-acervo.json";
  })(),

  async carregarCSV() {
    if (this.carregado) return this.registros;
    if (this._carregamentoPromise) return this._carregamentoPromise;

    this._carregamentoPromise = (async () => {
      try {
        const registrosSnapshot = await this._carregarSnapshotLocal();
        return this._aplicarRegistros(registrosSnapshot);
      } catch (erroSnapshot) {
        console.warn(
          "Snapshot local do catálogo indisponível; usando Google Sheets como fallback.",
          erroSnapshot
        );

        const registrosCsv = await this._carregarGoogleSheets();
        return this._aplicarRegistros(registrosCsv);
      }
    })();

    try {
      return await this._carregamentoPromise;
    } finally {
      this._carregamentoPromise = null;
    }
  },

  async _carregarSnapshotLocal() {
    if (typeof fetch !== "function") {
      throw new Error("Fetch indisponível para carregar o snapshot local.");
    }

    const resposta = await fetch(this.SNAPSHOT_URL, { cache: "no-cache" });
    if (!resposta.ok) {
      throw new Error(`Snapshot local respondeu HTTP ${resposta.status}.`);
    }

    const payload = await resposta.json();
    if (payload?.schemaVersion !== 1) {
      throw new Error("Versão do snapshot local não reconhecida.");
    }
    if (!Array.isArray(payload.registros)) {
      throw new Error("Snapshot local sem a lista de registros esperada.");
    }

    return payload.registros;
  },

  _carregarGoogleSheets() {
    const urlAtualizada = `${this.CSV_URL}&_=${Date.now()}`;

    return new Promise((resolve, reject) => {
      Papa.parse(urlAtualizada, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const erros = Array.isArray(results.errors) ? results.errors : [];
          // PapaParse sinaliza TooFewFields quando as últimas células vazias de uma
          // linha não vieram no CSV. Isso é comum e não desloca as colunas.
          // Os demais erros continuam bloqueando o carregamento para evitar dados corrompidos.
          const avisos = erros.filter((erro) => erro?.code === "TooFewFields");
          const errosRelevantes = erros.filter((erro) => erro?.code !== "TooFewFields");

          if (avisos.length) {
            console.warn(`CSV carregado com ${avisos.length} aviso(s) de campos finais ausentes.`, avisos);
          }

          if (errosRelevantes.length) {
            console.error("Erros detectados ao interpretar o CSV:", errosRelevantes);
            reject(new Error(`A planilha contém ${errosRelevantes.length} erro(s) de estrutura no CSV.`));
            return;
          }

          const campos = Array.isArray(results.meta?.fields) ? results.meta.fields : [];
          const obrigatorios = ["ID", "DATA", "PROGRAMA"];
          const camposNormalizados = campos.map((campo) => String(campo || "").trim().toUpperCase());
          const ausentes = obrigatorios.filter((campo) => !camposNormalizados.includes(campo));
          if (ausentes.length) {
            reject(new Error(`Colunas obrigatórias ausentes na planilha: ${ausentes.join(", ")}.`));
            return;
          }

          resolve(Array.isArray(results.data) ? results.data : []);
        },
        error: (err) => {
          console.error("Erro ao carregar a planilha:", err);
          reject(err);
        }
      });
    });
  },

  _aplicarRegistros(registros) {
    const normalizados = (Array.isArray(registros) ? registros : [])
      .map((registro) => this._normalizar(registro))
      .filter((registro) => registro.ID);

    if (!normalizados.length) {
      throw new Error("A fonte do catálogo não contém registros válidos com ID.");
    }

    // A ordem da fonte representa a ordem física da planilha imgs. Mantemos uma
    // cópia sem ordenação para recursos que precisam saber quais registros foram
    // inseridos por último, sem alterar a ordenação por data usada nas buscas.
    this.registrosOrdemInsercao = [...normalizados];
    this.registros = [...normalizados].sort(this._compararPorDataDesc);
    this.carregado = true;
    return this.registros;
  },

  _normalizar(item) {
    const mapa = {};
    Object.keys(item || {}).forEach((chaveOriginal) => {
      const chave = String(chaveOriginal || "").trim().toUpperCase();
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

  _criarDataValida(ano, mes, dia) {
    const y = Number(ano);
    const m = Number(mes);
    const d = Number(dia);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;

    const data = new Date(y, m - 1, d);
    if (
      data.getFullYear() !== y ||
      data.getMonth() !== m - 1 ||
      data.getDate() !== d
    ) return null;
    return data;
  },

  _parseData(dataStr) {
    if (!dataStr) return null;
    const str = String(dataStr).trim();

    let m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\D|$)/);
    if (m) {
      let [, d, mo, y] = m;
      if (y.length === 2) y = (Number(y) < 50 ? "20" : "19") + y;
      return this._criarDataValida(y, mo, d);
    }

    m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/);
    if (m) {
      const [, y, mo, d] = m;
      return this._criarDataValida(y, mo, d);
    }

    return null;
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
    if (typeof SearchEngine !== "undefined") {
      return SearchEngine.pesquisar(this.registros, termo || "");
    }
    if (!termo) return this.registros;
    const q = String(termo).toLocaleLowerCase("pt-BR");
    return this.registros.filter((r) =>
      Object.values(r).some((v) => String(v || "").toLocaleLowerCase("pt-BR").includes(q))
    );
  },

  buscarPorPrograma(programaNome, termo) {
    if (typeof SearchEngine !== "undefined") {
      return SearchEngine.pesquisar(this.registros, termo || "", { programa: programaNome || "" });
    }

    let base = this.registros;
    if (programaNome) {
      const p = decodeURIComponent(programaNome).toLocaleLowerCase("pt-BR").trim();
      base = base.filter((r) => String(r.PROGRAMA || "").toLocaleLowerCase("pt-BR").includes(p));
    }
    if (!termo) return base;

    const q = String(termo).toLocaleLowerCase("pt-BR");
    return base.filter((r) =>
      Object.values(r).some((v) => String(v || "").toLocaleLowerCase("pt-BR").includes(q))
    );
  }
};
