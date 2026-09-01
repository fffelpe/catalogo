(() => {
  const DATA_URL = "../data/mam-agrocultura.json";

  const normalizarStatus = (valor) => String(valor || "").trim().toLowerCase();
  const texto = (valor) => String(valor ?? "").trim();
  const normalizar = (valor) => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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

  function estaIngestado(item) {
    return ["ingestado", "no mam"].includes(normalizarStatus(item.status));
  }

  function identificarTipo(item) {
    const tipoInformado = normalizar(item.tipo || item.categoria || "");
    const base = normalizar(`${item.material || ""} ${item.titulo || ""} ${item.descricao || ""}`);

    if (tipoInformado.includes("stand") || /\bstand[ -]?up(s)?\b/.test(base)) {
      return "standup";
    }

    if (
      tipoInformado.includes("cobertura") ||
      base.includes("imagens de cobertura") ||
      base.includes("imagem de cobertura") ||
      base.includes("imagens cobertura") ||
      base.includes("cobertura pgm")
    ) {
      return "cobertura";
    }

    if (tipoInformado === "vt" || tipoInformado.includes("materia") || /(^|\s|_)vt(\s|_|$)/.test(base)) {
      return "vt";
    }

    return "outro";
  }

  function labelTipo(tipo) {
    if (tipo === "vt") return "VT";
    if (tipo === "standup") return "STAND-UP";
    if (tipo === "cobertura") return "IMAGENS DE COBERTURA";
    return "OUTRO";
  }

  function classeStatus(status) {
    if (status === "ingestado" || status === "no mam") return "mam-status-ingestado";
    if (status === "pendente") return "mam-status-pendente";
    return "mam-status-nao-encontrado";
  }

  function labelStatus(status) {
    if (status === "ingestado" || status === "no mam") return "Ingestado";
    if (status === "pendente") return "Pendente";
    return "Não encontrado";
  }

  function semCreditosComId(item) {
    return Boolean(texto(item.mediaId)) && !Boolean(item.creditos);
  }

  function filtrar(items, filtro) {
    if (filtro === "todos") return items;
    if (filtro === "sem-creditos") return items.filter(semCreditosComId);
    if (filtro === "ingestado") return items.filter(estaIngestado);
    if (["vt", "standup", "cobertura"].includes(filtro)) {
      return items.filter((item) => identificarTipo(item) === filtro);
    }
    return items;
  }

  function atualizarResumo(items) {
    const ingestados = items.filter(estaIngestado).length;
    const vts = items.filter((item) => identificarTipo(item) === "vt").length;
    const standups = items.filter((item) => identificarTipo(item) === "standup").length;
    const coberturas = items.filter((item) => identificarTipo(item) === "cobertura").length;
    const idsSemCreditos = items.filter(semCreditosComId).length;

    document.getElementById("mamIngestados").textContent = ingestados;
    document.getElementById("mamTotalVts").textContent = vts;
    document.getElementById("mamTotalStandups").textContent = standups;
    document.getElementById("mamTotalCoberturas").textContent = coberturas;
    document.getElementById("mamIdsSemCreditos").textContent = idsSemCreditos;
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
        : "O painel ainda não possui registros para exibir.";
      return;
    }

    mensagem.textContent = `${filtrados.length} material(is) exibido(s).`;
    wrap.hidden = false;

    tbody.innerHTML = filtrados.map((item) => {
      const status = normalizarStatus(item.status);
      const mediaId = texto(item.mediaId);
      const creditos = Boolean(item.creditos);
      const tipo = identificarTipo(item);

      return `
        <tr>
          <td data-label="Tipo"><span class="mam-tipo mam-tipo-${tipo}">${labelTipo(tipo)}</span></td>
          <td data-label="Status"><span class="mam-status ${classeStatus(status)}">${labelStatus(status)}</span></td>
          <td data-label="Material">${escapeHtml(item.material || item.titulo || "—")}</td>
          <td data-label="Afiliada">${escapeHtml(item.afiliada || "—")}</td>
          <td data-label="Media ID">${mediaId ? escapeHtml(mediaId) : '<span class="mam-id-vazio">—</span>'}</td>
          <td data-label="Duração">${escapeHtml(item.duracao || "—")}</td>
          <td data-label="Cadastro MAM">${escapeHtml(item.dataCadastroMam || "—")}</td>
          <td data-label="Créditos"><span class="${creditos ? "mam-creditos-ok" : "mam-creditos-nao"}">${creditos ? "Disponíveis" : (mediaId ? "ID sem créditos" : "Não encontrados")}</span></td>
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
      console.error("Erro ao carregar painel do acervo do Agrocultura:", erro);
      const mensagem = document.getElementById("mamAgroMensagem");
      if (mensagem) mensagem.textContent = "Não foi possível carregar os dados do painel do acervo.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
