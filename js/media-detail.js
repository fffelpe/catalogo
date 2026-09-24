// media-detail.js - Monta a ficha individual de um Media ID.

const MediaDetail = (() => {
  function escapeHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function parseParametros(search) {
    const params = new URLSearchParams(String(search || ""));
    const id = typeof MediaIdUtils !== "undefined"
      ? MediaIdUtils.normalizar(params.get("id") || "")
      : "";
    const bruto = Number(params.get("t"));
    const start = Number.isFinite(bruto) && bruto >= 0 ? bruto : 0;
    return { id, start };
  }

  function idsAssociados(registro, principal) {
    if (typeof MediaIdUtils === "undefined") return [];
    const idPrincipal = MediaIdUtils.normalizar(principal);
    return MediaIdUtils.extrair(registro?.ID || "").filter((id) => id !== idPrincipal);
  }

  function valorOuTraco(valor) {
    const texto = String(valor || "").trim();
    return texto ? escapeHtml(texto) : "—";
  }

  function setEstado(mensagem, tipo = "info") {
    const estado = document.getElementById("mediaDetailState");
    const conteudo = document.getElementById("mediaDetailContent");
    if (estado) {
      estado.hidden = false;
      estado.className = `media-detail-state media-detail-state--${tipo}`;
      estado.textContent = mensagem;
    }
    if (conteudo) conteudo.hidden = true;
  }

  async function carregarOpcionais() {
    const fontes = [];
    if (typeof MediaEnrichment !== "undefined" && typeof MediaEnrichment.carregar === "function") {
      fontes.push({ nome: "enrichment", promise: MediaEnrichment.carregar() });
    }
    if (typeof CreditosMedia !== "undefined" && typeof CreditosMedia.carregar === "function") {
      fontes.push({ nome: "créditos", promise: CreditosMedia.carregar() });
    }

    const estados = await Promise.allSettled(fontes.map((fonte) => fonte.promise));
    estados.forEach((estado, indice) => {
      if (estado.status === "rejected") {
        console.warn(`Fonte opcional de ${fontes[indice].nome} indisponível na ficha:`, estado.reason);
      }
    });
  }

  function renderizarCabecalho(id, registro) {
    const titulo = document.getElementById("mediaIdTitle");
    if (titulo) titulo.textContent = `Media ID ${id}`;

    const copy = document.getElementById("mediaCopyButton");
    if (copy) {
      copy.dataset.id = id;
      copy.setAttribute("aria-label", `Copiar Media ID ${id}`);
    }

    const associados = idsAssociados(registro, id);
    const alvo = document.getElementById("mediaAssociatedIds");
    if (alvo) {
      alvo.hidden = associados.length === 0;
      alvo.innerHTML = associados.length
        ? `IDs associados: ${associados.map((item) => `<a href="media.html?id=${encodeURIComponent(item)}">${escapeHtml(item)}</a>`).join(", ")}`
        : "";
    }
  }

  function renderizarMetadados(registro) {
    const alvo = document.getElementById("mediaMetadata");
    if (!alvo) return;
    const campos = [
      ["Data", registro.DATA],
      ["Programa", registro.PROGRAMA],
      ["Editoria", registro.EDITORIA],
      ["Local", registro.LOCAL],
      ["Repórter", registro.REPORTER],
      ["Afiliada / Emissora", registro.AFILIADA_EMISSORA],
      ["PGM", registro.PGM]
    ];

    alvo.innerHTML = campos.map(([rotulo, valor]) => `
      <div class="media-meta-row">
        <span class="media-meta-label">${escapeHtml(rotulo)}</span>
        <span class="media-meta-value">${valorOuTraco(valor)}</span>
      </div>
    `).join("");
  }

  function renderizarDescricao(registro) {
    const alvo = document.getElementById("mediaDescriptionText");
    if (alvo) alvo.textContent = String(registro.DESCRICAO || "Descrição não informada.");
  }

  function renderizarTags(id) {
    const secao = document.getElementById("mediaTagsSection");
    const alvo = document.getElementById("mediaTags");
    if (!secao || !alvo || typeof MediaEnrichment === "undefined") return;

    const item = MediaEnrichment.obter(id);
    const tags = item
      ? [...(item.subjects || []), ...(item.keywords || []), ...(item.people || []), ...(item.places || [])]
      : [];
    const unicas = [...new Map(tags.map((tag) => [String(tag).toLocaleLowerCase("pt-BR"), String(tag)])).values()];

    secao.hidden = unicas.length === 0;
    alvo.innerHTML = unicas.map((tag) => `<span class="media-tag">${escapeHtml(tag)}</span>`).join("");
  }

  function renderizarSegmentos(id) {
    const secao = document.getElementById("mediaSegmentsSection");
    const alvo = document.getElementById("mediaSegments");
    if (!secao || !alvo || typeof MediaEnrichment === "undefined") return;

    const segmentos = MediaEnrichment.obterSegmentos(id);
    secao.hidden = segmentos.length === 0;
    alvo.innerHTML = segmentos.map((segmento) => {
      const timecode = typeof MediaSegments !== "undefined"
        ? MediaSegments.formatarTimecode(segmento.start)
        : String(segmento.start);
      return `
        <button type="button" class="media-segment" data-start="${Number(segmento.start)}" aria-label="Ir para ${escapeHtml(timecode)} — ${escapeHtml(segmento.text)}">
          <span class="media-segment-play" aria-hidden="true">▶</span>
          <span class="media-segment-time">${escapeHtml(timecode)}</span>
          <span class="media-segment-text">${escapeHtml(segmento.text)}</span>
        </button>
      `;
    }).join("");
  }

  function renderizarCreditos(id) {
    const secao = document.getElementById("mediaCreditsSection");
    const alvo = document.getElementById("mediaCredits");
    if (!secao || !alvo || typeof CreditosMedia === "undefined") return;

    const dados = CreditosMedia.obter(id);
    if (!dados) {
      secao.hidden = true;
      return;
    }

    const linhas = [];
    if (dados.materia) linhas.push(`<div><strong>Matéria:</strong> ${escapeHtml(dados.materia)}</div>`);
    (Array.isArray(dados.fontes) ? dados.fontes : []).forEach((fonte) => {
      const nome = escapeHtml(fonte?.nome || "");
      const cargo = escapeHtml(fonte?.cargo || "");
      if (nome || cargo) linhas.push(`<div><strong>Fonte:</strong> ${nome}${cargo ? ` — ${cargo}` : ""}</div>`);
    });
    Object.entries(dados.creditos || {}).forEach(([cargo, nomes]) => {
      const lista = Array.isArray(nomes) ? nomes.filter(Boolean) : [nomes].filter(Boolean);
      if (lista.length) linhas.push(`<div><strong>${escapeHtml(cargo)}:</strong> ${lista.map(escapeHtml).join(", ")}</div>`);
    });

    secao.hidden = linhas.length === 0;
    alvo.innerHTML = linhas.join("");
  }

  function renderizarRelacionados(registro, id) {
    const secao = document.getElementById("mediaRelatedSection");
    const alvo = document.getElementById("mediaRelated");
    if (!secao || !alvo || typeof RelatedMedia === "undefined") return;

    const relacionados = RelatedMedia.calcular(registro, DadosMedia.registros, { mediaId: id });
    secao.hidden = relacionados.length === 0;
    alvo.innerHTML = relacionados.map(({ registro: item }) => {
      const primeiroId = typeof MediaIdUtils !== "undefined" ? MediaIdUtils.extrair(item.ID)[0] : "";
      const href = primeiroId ? `media.html?id=${encodeURIComponent(primeiroId)}` : "#";
      return `
        <a class="related-card" href="${escapeHtml(href)}">
          <span class="related-card-thumb" aria-hidden="true">▶</span>
          <span class="related-card-title">${escapeHtml(item.DESCRICAO || primeiroId || "Conteúdo relacionado")}</span>
          <span class="related-card-meta">${valorOuTraco(item.DATA)} · ${valorOuTraco(item.PROGRAMA)}</span>
        </a>
      `;
    }).join("");
  }

  function renderizarCompletude(registro, id) {
    const alvo = document.getElementById("mediaCompleteness");
    if (!alvo) return;
    const campos = [registro.DESCRICAO, registro.DATA, registro.PROGRAMA, registro.LOCAL, registro.REPORTER];
    const preenchidos = campos.filter((valor) => String(valor || "").trim()).length;
    const possuiSegmentos = typeof MediaEnrichment !== "undefined" && MediaEnrichment.obterSegmentos(id).length > 0;
    alvo.textContent = `${preenchidos}/5 metadados editoriais principais preenchidos${possuiSegmentos ? " · com segmentos indexados" : ""}.`;
  }

  async function copiarId(id, botao) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(id);
      else {
        const area = document.createElement("textarea");
        area.value = id;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      if (botao) botao.textContent = "Copiado";
      window.setTimeout(() => { if (botao) botao.textContent = "Copiar ID"; }, 1200);
    } catch (erro) {
      console.warn("Não foi possível copiar o Media ID:", erro);
    }
  }

  function vincularInteracoes(id) {
    const copy = document.getElementById("mediaCopyButton");
    if (copy) copy.addEventListener("click", () => copiarId(id, copy));

    const video = document.getElementById("mediaVideo");
    document.getElementById("mediaSegments")?.addEventListener("click", (event) => {
      const botao = event.target.closest(".media-segment");
      if (!botao || !video) return;
      const inicio = Number(botao.dataset.start);
      if (Number.isFinite(inicio) && inicio >= 0) video.currentTime = inicio;
    });
  }

  async function inicializar() {
    const conteudo = document.getElementById("mediaDetailContent");
    if (!conteudo) return;

    const { id, start } = parseParametros(window.location.search);
    if (!id) {
      setEstado("Media ID inválido.", "erro");
      return;
    }

    try {
      await DadosMedia.carregarCSV();
    } catch (erro) {
      console.error(erro);
      setEstado("Não foi possível carregar o acervo.", "erro");
      return;
    }

    await carregarOpcionais();
    const registro = DadosMedia.buscarPorMediaId(id);
    if (!registro) {
      setEstado(`Media ID ${id} não encontrado no acervo.`, "aviso");
      return;
    }

    document.getElementById("mediaDetailState")?.setAttribute("hidden", "");
    conteudo.hidden = false;

    renderizarCabecalho(id, registro);
    renderizarDescricao(registro);
    renderizarMetadados(registro);
    renderizarCreditos(id);
    renderizarTags(id);
    renderizarSegmentos(id);
    renderizarRelacionados(registro, id);
    renderizarCompletude(registro, id);

    const video = document.getElementById("mediaVideo");
    const status = document.getElementById("mediaPlayerStatus");
    if (typeof MediaPlayer !== "undefined") {
      const configurado = MediaPlayer.configurar(video, id, start, status);
      if (!configurado && status) {
        status.hidden = false;
        status.textContent = "Pré-visualização indisponível para este Media ID.";
      }
    }

    vincularInteracoes(id);
  }

  return {
    parseParametros,
    idsAssociados,
    inicializar
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  MediaDetail.inicializar();
});
