// vts-agrocultura.js - Abas "VT'S + ano" na página do Agrocultura.
// Cada aba aponta para a aba (gid) correspondente na planilha de VTs do
// Agrocultura, publicada em CSV. Comportamento de toggle:
//   - clique numa aba fechada  -> abre e carrega a tabela daquele ano
//   - clique na mesma aba já aberta -> fecha a tabela
//   - clique em outra aba enquanto uma está aberta -> troca para a nova

const VTS_AGROCULTURA_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvMKT9ycP6Bk66plwxEKwmjW_nvIRyDvMLbABB7mBbc_Z0Y2u-LaCGgYXHipyquWTyItoU3ZKydvYT/pub";

const VTS_AGROCULTURA_ABAS = [
  { label: "VT'S 2019", gid: "1685526249" },
  { label: "VT'S 2020", gid: "1257444550" },
  { label: "VT'S 2021", gid: "1171982976" },
  { label: "VT'S 2022", gid: "796043664" },
  { label: "VT'S 2023", gid: "1173010890" },
  { label: "VT'S 2024", gid: "1458299234" },
  { label: "VT'S 2025", gid: "1109137516" },
  { label: "VT'S 2026", gid: "261089273" },
  { label: "VT'S BRUNO FAUSTINO", gid: "1910417967" }
];

const _cacheVtsAgro = {};

function _urlVtsAgro(gid) {
  return `${VTS_AGROCULTURA_BASE_URL}?gid=${gid}&single=true&output=csv`;
}

// Chamada a partir de catalogo-ui.js. Só faz algo na página do Agrocultura;
// em qualquer outro programa a seção fica escondida.
function inicializarVtsAgricultura(programaParam) {
  const secao = document.getElementById("secaoVTsAgro");
  const tabsEl = document.getElementById("tabsVts");
  const wrapTabela = document.getElementById("wrapTabelaVtsAgro");
  if (!secao || !tabsEl || !programaParam) return;

  const nomePrograma = decodeURIComponent(programaParam).toLowerCase().trim();
  if (nomePrograma !== "agrocultura") {
    secao.hidden = true;
    return;
  }

  secao.hidden = false;
  tabsEl.innerHTML = "";

  // Nenhuma aba fica selecionada nem tabela visível ao abrir a página.
  // O usuário precisa clicar para abrir; os "materiais brutos" abaixo
  // continuam sempre visíveis, independente disso.
  if (wrapTabela) wrapTabela.hidden = true;

  VTS_AGROCULTURA_ABAS.forEach((aba) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-vt";
    btn.textContent = aba.label;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.dataset.gid = aba.gid;
    btn.addEventListener("click", () => _alternarAbaVt(aba, btn));
    tabsEl.appendChild(btn);
  });
}

function _alternarAbaVt(aba, btnEl) {
  const wrapTabela = document.getElementById("wrapTabelaVtsAgro");
  const jaEstaAberta = btnEl.classList.contains("ativa");

  // Sempre desmarca todas as abas antes de decidir o novo estado.
  document.querySelectorAll(".tab-vt").forEach((b) => {
    b.classList.remove("ativa");
    b.setAttribute("aria-selected", "false");
  });

  if (jaEstaAberta) {
    // Clicou de novo na aba que já estava aberta: fecha a tabela.
    if (wrapTabela) wrapTabela.hidden = true;
    return;
  }

  // Abre a aba clicada (e troca automaticamente se outra estava aberta).
  btnEl.classList.add("ativa");
  btnEl.setAttribute("aria-selected", "true");
  if (wrapTabela) wrapTabela.hidden = false;

  _carregarAbaVt(aba);
}

function _carregarAbaVt(aba) {
  const thead = document.getElementById("theadVtsAgro");
  const tbody = document.getElementById("tbodyVtsAgro");
  if (!thead || !tbody) return;

  thead.innerHTML = "";
  tbody.innerHTML = '<tr><td>Carregando...</td></tr>';

  if (_cacheVtsAgro[aba.gid]) {
    _renderizarTabelaVtsAgro(_cacheVtsAgro[aba.gid]);
    return;
  }

  Papa.parse(_urlVtsAgro(aba.gid), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      _cacheVtsAgro[aba.gid] = results.data;
      _renderizarTabelaVtsAgro(results.data);
    },
    error: (err) => {
      console.error(`Erro ao carregar a aba ${aba.label}:`, err);
      tbody.innerHTML = '<tr><td>Não foi possível carregar esta planilha.</td></tr>';
    }
  });
}

function _renderizarTabelaVtsAgro(linhas) {
  const thead = document.getElementById("theadVtsAgro");
  const tbody = document.getElementById("tbodyVtsAgro");

  if (!linhas || linhas.length === 0) {
    thead.innerHTML = "";
    tbody.innerHTML = '<tr><td>Nenhum dado encontrado nesta aba.</td></tr>';
    return;
  }

  // Usa as colunas reais da planilha selecionada (podem variar entre anos).
  const colunas = Object.keys(linhas[0])
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  thead.innerHTML = `<tr>${colunas.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;

  tbody.innerHTML = linhas
    .map((linha) => {
      const celulas = colunas
        .map((c) => {
          const valor = (linha[c] || "").toString().trim();
          return c.toUpperCase() === "ID"
            ? renderizarCelulaId(valor, c)
            : `<td data-label="${escapeHtml(c)}">${escapeHtml(valor)}</td>`;
        })
        .join("");
      return `<tr>${celulas}</tr>`;
    })
    .join("");
}
