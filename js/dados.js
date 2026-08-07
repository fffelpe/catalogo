// dados.js — Responsável por carregar e gerenciar os dados do acervo (Google Sheets)
//
// IMPORTANTE: o arquivo imgs.csv que existia no repositório continha o link da versão
// "/pubhtml" da planilha, que devolve uma página HTML — não dados. O PapaParse precisa
// da versão "/pub?output=csv". A URL abaixo já está no formato correto (mesma planilha,
// mesmo gid, apenas trocando pubhtml -> pub&output=csv).
//
// Se você publicar a planilha novamente (Arquivo > Compartilhar > Publicar na Web),
// o Google gera uma URL parecida com:
//   https://docs.google.com/spreadsheets/d/e/XXXXXXXX/pubhtml?gid=0&single=true
// Para usar aqui, troque "pubhtml" por "pub" e acrescente "&output=csv" no final.

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2OEG80BFtybMx8s_f8LQBcFB0ABufM9eVtLNEyRbqndaKdXEozzt_A969NEX_Iv2vdPYSvQU_P2FP/pub?gid=0&single=true&output=csv";

// Colunas oficiais da planilha, na ordem em que devem ser exibidas nos resultados.
const COLUNAS = [
  "ID",
  "DESCRIÇÃO",
  "DATA",
  "LOCAL",
  "REPÓRTER",
  "AFILIADA",
  "EMISSORA",
  "PROGRAMA",
  "EDITORIA",
];

// Colunas usadas na busca por palavra-chave (tudo, exceto ID e DATA, que têm buscas próprias).
const COLUNAS_BUSCA_TEXTO = [
  "DESCRIÇÃO",
  "LOCAL",
  "REPÓRTER",
  "AFILIADA",
  "EMISSORA",
  "PROGRAMA",
  "EDITORIA",
];

const DadosMedia = {
  registros: [],
  carregado: false,
  erro: null,

  // Normaliza um nome de cabeçalho: remove espaços nas pontas, colapsa espaços internos,
  // e deixa em maiúsculas — protege contra cabeçalhos como "DATA " (com espaço sobrando)
  // ou variações de acentuação vindas do Sheets.
  _normalizarChave(chave) {
    return String(chave || "")
      .normalize("NFC")
      .trim()
      .toUpperCase();
  },

  // Recebe uma linha crua do PapaParse (chaves podem ter espaços/variações) e devolve
  // um objeto só com as chaves oficiais de COLUNAS, sempre presentes (mesmo que vazias).
  _normalizarLinha(linhaCrua) {
    const mapa = {};
    for (const chaveOriginal of Object.keys(linhaCrua)) {
      mapa[this._normalizarChave(chaveOriginal)] = linhaCrua[chaveOriginal];
    }
    const linha = {};
    for (const coluna of COLUNAS) {
      linha[coluna] = (mapa[coluna] ?? "").toString().trim();
    }
    return linha;
  },

  async carregarCSV() {
    if (this.carregado) return this.registros;

    return new Promise((resolve, reject) => {
      Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.registros = (results.data || [])
            .map((linha) => this._normalizarLinha(linha))
            // descarta linhas totalmente vazias (linhas em branco na planilha)
            .filter((linha) => COLUNAS.some((c) => linha[c] !== ""));
          this.carregado = true;
          this.erro = null;
          resolve(this.registros);
        },
        error: (err) => {
          console.error("Erro ao carregar a planilha (CSV):", err);
          this.erro = err;
          reject(err);
        },
      });
    });
  },

  // Busca por palavra-chave em todas as colunas de texto relevantes + ID.
  buscar(termo) {
    if (!termo || !termo.trim()) return this.registros;
    const query = termo.trim().toLowerCase();

    return this.registros.filter((item) => {
      if ((item.ID || "").toLowerCase().includes(query)) return true;
      return COLUNAS_BUSCA_TEXTO.some((coluna) =>
        (item[coluna] || "").toLowerCase().includes(query)
      );
    });
  },

  // Filtra por programa (usado em pages/programa.html?programa=SLUG).
  // Aceita nome exato (ex.: "AGROCULTURA") ou slug com hífen/underline.
  filtrarPorPrograma(programa) {
    if (!programa) return this.registros;
    const alvo = programa.trim().toLowerCase().replace(/[-_]+/g, " ");
    return this.registros.filter(
      (item) => (item.PROGRAMA || "").trim().toLowerCase() === alvo
    );
  },

  // Combina filtro de programa + busca textual (usado quando a página de resultados
  // recebe tanto ?programa= quanto ?q=).
  buscarComPrograma(termo, programa) {
    const base = programa ? this.filtrarPorPrograma(programa) : this.registros;
    if (!termo || !termo.trim()) return base;
    const query = termo.trim().toLowerCase();
    return base.filter((item) => {
      if ((item.ID || "").toLowerCase().includes(query)) return true;
      return COLUNAS_BUSCA_TEXTO.some((coluna) =>
        (item[coluna] || "").toLowerCase().includes(query)
      );
    });
  },
};