(() => {
  const DATA_URL = "../data/mam-agrocultura.json";

  const normalizarStatus = (valor) => String(valor || "").trim().toLowerCase();
  const texto = (valor) => String(valor ?? "").trim();

  function escapeHtml(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function estaNoAgrocultura() {
    const params = new URLSearchParams(window.location.search);
    const programa = (params.get("programa") || params.get("p") || "").toLowerCase().trim();
    const titulo = (document.getElementById("tituloPrograma")?.textContent || "").toLowerCase().trim();
    return programa === "agrocultura" || titulo === "agrocultura";
  }

  function classeStatus(status) {
    if (status === "ingestado" || status === "no mam") return "mam-status-ingestado";
    if (status === "pendente") return "mam-status-pendente";
    return "mam-status-nao-encontrado";
  }

  function labelStatus(status) {
    if (status === "ingestado" || status === "no mam") return "No MAM";
    if (status === "pendente") return "Pendente";
    return "Não encontrado";
  }

  function filtrar(items, filtro) {
    if (filtro === "todos") return items;
    if (filtro === "sem-creditos") return items.filter((item) => !item.creditos);
    if (filtro === "ingestado") {
      return items.filter((item) => ["ingestado", "no mam"].includes(normalizarStatus(item.status)));
    }
    if (filtro === "pendente") {
      return items.filter((item) => !["ingestado", "no mam"].includes(normalizarStatus(item.status)));
    }
    return items;
  }

  function atualizarResumo(items) {
    const noMam = items.filter((item) => ["ingestado", "no mam"].includes(normalizarStatus(item.status))).length;
    const pendentes = items.length - noMam;
    const semCreditos = items.filter((item) => !item.creditos).length;

    document.getElementById("mamTotal").textContent = items.length;
    document.getElementById("mamIngestados").textContent = noMam;
    document.getElementById("mamPendentes").textContent = pendentes;
    document.getElementById("mamSemCreditos").textContent = semCreditos;
  }

  function renderizar(items, filtro = "todos") {
    const tbody = document.getElementById("mamAgroBody");
    const wrap = document.getElementById("mamAgroTabelaWrap");
    const mensagem = document.getElementById("mamAgroMensagem");
    if (!tbody || !wrap || !mensagem) return;

    const filtrados = filtrar(items, filtro);

    if (!filtrados.length) {
      tbody.innerHTML = "";
      wrap.hidden = true;
      mensagem.textContent = items.length
        ? "Nenhum material encontrado neste filtro."
        : "A sincronização MAM ainda não gerou registros para exibir.";
      return;
    }

    mensagem.textContent = `${filtrados.length} material(is) exibido(s).`;
    wrap.hidden = false;

    tbody.innerHTML = filtrados.map((item) => {
      const status = normalizarStatus(item.status);
      const mediaId = texto(item.mediaId);
      const creditos = Boolean(item.creditos);

      return `
        <tr>
          <td data-label="Status"><span class="mam-status ${classeStatus(status)}">${labelStatus(status)}</span></td>
          <td data-label="Material">${escapeHtml(item.material || item.titulo || "—")}</td>
          <td data-label="Afiliada">${escapeHtml(item.afiliada || "—")}</td>
          <td data-label="Media ID">${mediaId ? escapeHtml(mediaId) : '<span class="mam-id-vazio">—</span>'}</td>
          <td data-label="Duração">${escapeHtml(item.duracao || "—")}</td>
          <td data-label="Cadastro MAM">${escapeHtml(item.dataCadastroMam || "—")}</td>
          <td data-label="Créditos"><span class="${creditos ? "mam-creditos-ok" : "mam-creditos-nao"}">${creditos ? "Disponíveis" : "Não encontrados"}</span></td>
        </tr>`;
    }).join("");
  }

  function ativarFiltros(items) {
    document.querySelectorAll("[data-mam-filtro]").forEach((botao) => {
      botao.addEventListener("click", () => {
        document.querySelectorAll("[data-mam-filtro]").forEach((b) => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        renderizar(items, botao.dataset.mamFiltro || "todos");
      });
    });
  }

  async function iniciar() {
    const secao = document.getElementById("secaoMamAgro");
    if (!secao || !estaNoAgrocultura()) return;

    secao.hidden = false;

    try {
      const resposta = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

      const dados = await resposta.json();
      const items = Array.isArray(dados) ? dados : (Array.isArray(dados.items) ? dados.items : []);
      const atualizado = document.getElementById("mamAgroAtualizado");

      if (atualizado && dados.generatedAt) {
        const data = new Date(dados.generatedAt);
        atualizado.textContent = Number.isNaN(data.getTime())
          ? `Atualizado: ${escapeHtml(dados.generatedAt)}`
          : `Atualizado: ${data.toLocaleString("pt-BR")}`;
      }

      atualizarResumo(items);
      ativarFiltros(items);
      renderizar(items);
    } catch (erro) {
      console.error("Erro ao carregar controle MAM do Agrocultura:", erro);
      const mensagem = document.getElementById("mamAgroMensagem");
      if (mensagem) mensagem.textContent = "Não foi possível carregar os dados do controle MAM.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
