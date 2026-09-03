// ultimos-ids.js - Exibe os últimos registros inseridos fisicamente na planilha imgs

(() => {
  const LIMITE = 6;

  function escaparHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function textoOuTraco(valor) {
    const texto = String(valor || "").trim();
    return texto || "—";
  }

  function chaveId(valor) {
    return String(valor || "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  function obterUltimosRegistros() {
    const origem = Array.isArray(DadosMedia.registrosOrdemInsercao)
      ? DadosMedia.registrosOrdemInsercao
      : [];

    const vistos = new Set();
    const ultimos = [];

    for (let i = origem.length - 1; i >= 0 && ultimos.length < LIMITE; i -= 1) {
      const registro = origem[i];
      const chave = chaveId(registro?.ID);
      if (!chave || vistos.has(chave)) continue;

      vistos.add(chave);
      ultimos.push(registro);
    }

    return ultimos;
  }

  function criarCard(registro) {
    const id = textoOuTraco(registro.ID);
    const descricao = textoOuTraco(registro.DESCRICAO);
    const programa = textoOuTraco(registro.PROGRAMA);
    const editoria = textoOuTraco(registro.EDITORIA);
    const local = textoOuTraco(registro.LOCAL);
    const href = `pages/resultado-busca.html?q=${encodeURIComponent(registro.ID || "")}`;

    return `
      <article class="ultimo-id-card">
        <div class="ultimo-id-topo">
          <a class="ultimo-id-media" href="${href}" aria-label="Pesquisar o Media ID ${escaparHtml(id)}">
            ${escaparHtml(id)}
          </a>
          <span class="ultimo-id-programa">${escaparHtml(programa)}</span>
        </div>
        <p class="ultimo-id-descricao" title="${escaparHtml(descricao)}">${escaparHtml(descricao)}</p>
        <dl class="ultimo-id-metadados">
          <div>
            <dt>Editoria</dt>
            <dd>${escaparHtml(editoria)}</dd>
          </div>
          <div>
            <dt>Local</dt>
            <dd>${escaparHtml(local)}</dd>
          </div>
        </dl>
      </article>
    `;
  }

  async function iniciar() {
    const painel = document.getElementById("ultimosIdsPainel");
    const lista = document.getElementById("ultimosIdsLista");
    const status = document.getElementById("ultimosIdsStatus");
    if (!painel || !lista || !status || typeof DadosMedia === "undefined") return;

    try {
      status.textContent = "Carregando últimos IDs...";
      await DadosMedia.carregarCSV();

      const registros = obterUltimosRegistros();
      if (!registros.length) {
        status.textContent = "Nenhum Media ID disponível no momento.";
        lista.innerHTML = "";
        return;
      }

      lista.innerHTML = registros.map(criarCard).join("");
      status.textContent = `${registros.length} registros mais recentes da planilha central`;
    } catch (erro) {
      console.error("Não foi possível carregar o painel de últimos IDs:", erro);
      lista.innerHTML = "";
      status.textContent = "Não foi possível carregar os últimos IDs agora.";
      painel.classList.add("ultimos-ids-erro");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
