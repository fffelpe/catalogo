// media-detail.js
// Orquestra a ficha individual do Media ID usando dados editoriais e enrichment opcional.

const MediaDetail = (() => {
  function el(tag, classe, texto) {
    const node = document.createElement(tag);
    if (classe) node.className = classe;
    if (texto != null) node.textContent = String(texto);
    return node;
  }

  function valorOuTraco(valor) {
    const texto = String(valor || "").trim();
    return texto || "—";
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    return Promise.resolve();
  }

  function definirEstado(mensagem, tipo = "") {
    const estado = document.getElementById("mediaState");
    const conteudo = document.getElementById("mediaContent");
    if (estado) {
      estado.textContent = mensagem;
      estado.className = `media-state ${tipo}`.trim();
      estado.hidden = !mensagem;
    }
    if (conteudo) conteudo.hidden = Boolean(mensagem);
  }

  function renderMetadata(registro) {
    const container = document.getElementById("mediaMetadata");
    if (!container) return;
    container.textContent = "";
    const campos = [
      ["Data", registro.DATA],
      ["Programa", registro.PROGRAMA],
      ["Editoria", registro.EDITORIA],
      ["Local", registro.LOCAL],
      ["Repórter", registro.REPORTER],
      ["Afiliada / Emissora", registro.AFILIADA_EMISSORA],
      ["PGM", registro.PGM]
    ];
    campos.forEach(([rotulo, valor]) => {
      const row = el("div", "media-meta-row");
      row.append(el("span", "media-meta-label", rotulo));
      row.append(el("span", "media-meta-value", valorOuTraco(valor)));
      container.append(row);
    });
  }

  function renderTags(enrichment) {
    const container = document.getElementById("mediaTags");
    if (!container) return;
    container.textContent = "";
    const tags = [
      ...(enrichment?.subjects || []),
      ...(enrichment?.keywords || []),
      ...(enrichment?.people || []),
      ...(enrichment?.places || [])
    ];
    const unicos = [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
    if (!unicos.length) {
      container.append(el("p", "media-empty", "Este Media ID ainda não possui palavras-chave enriquecidas."));
      return;
    }
    unicos.forEach((tag) => container.append(el("span", "media-tag", tag)));
  }

  function renderSegments(segmentos, video) {
    const container = document.getElementById("mediaSegments");
    if (!container) return;
    container.textContent = "";
    if (!segmentos.length) {
      container.append(el("p", "media-empty", "Nenhum trecho indexado para este vídeo."));
      return;
    }

    segmentos.forEach((segmento) => {
      const botao = el("button", "media-segment-button");
      botao.type = "button";
      botao.setAttribute("aria-label", `Assistir trecho em ${MediaSegments.formatarTimecode(segmento.start)}`);
      botao.append(el("span", "media-segment-play", "▶"));
      botao.append(el("span", "media-timecode", MediaSegments.formatarTimecode(segmento.start)));
      botao.append(el("span", "media-segment-text", segmento.text));
      botao.addEventListener("click", () => MediaPlayer.irPara(video, segmento.start));
      container.append(botao);
    });
  }

  function renderCredits(mediaId, creditosCarregados) {
    const section = document.getElementById("mediaCreditsSection");
    const container = document.getElementById("mediaCredits");
    if (!section || !container || !creditosCarregados || typeof CreditosMedia === "undefined") return;
    const dados = CreditosMedia.obter(mediaId);
    if (!dados) return;

    container.textContent = "";
    const grid = el("div", "media-credit-grid");
    const adicionar = (rotulo, valor) => {
      if (!valor) return;
      const item = el("div", "media-credit-item");
      item.append(el("span", "media-credit-label", rotulo));
      item.append(el("span", "media-credit-value", Array.isArray(valor) ? valor.join(", ") : valor));
      grid.append(item);
    };

    adicionar("Matéria", dados.materia);
    Object.entries(dados.creditos || {}).forEach(([cargo, valor]) => adicionar(cargo, valor));
    if (Array.isArray(dados.fontes) && dados.fontes.length) {
      adicionar("Fontes", dados.fontes.map((fonte) => [fonte?.nome, fonte?.cargo].filter(Boolean).join(" — ")).filter(Boolean));
    }
    if (!grid.children.length) return;
    container.append(grid);
    section.hidden = false;
  }

  function renderRelated(registro, mediaId) {
    const container = document.getElementById("mediaRelated");
    if (!container) return;
    container.textContent = "";
    const relacionados = RelatedMedia.calcular(registro, DadosMedia.registros, { limite: 6 });
    if (!relacionados.length) {
      container.append(el("p", "media-empty", "Ainda não há conteúdos relacionados com similaridade suficiente."));
      return;
    }

    relacionados.forEach((item) => {
      const idRelacionado = MediaIdUtils.extrair(item.ID)[0];
      if (!idRelacionado) return;
      const link = el("a", "media-related-card");
      link.href = `media.html?id=${encodeURIComponent(idRelacionado)}`;
      link.append(el("span", "media-related-id", idRelacionado));
      link.append(el("p", "media-related-description", valorOuTraco(item.DESCRICAO)));
      link.append(el("span", "media-related-meta", [item.DATA, item.PROGRAMA].filter(Boolean).join(" · ")));
      container.append(link);
    });
  }

  function renderQuality(registro, mediaId, creditosCarregados) {
    const container = document.getElementById("mediaQuality");
    if (!container) return;
    container.textContent = "";
    const resultado = CatalogoQuality.avaliarRegistro(registro, {
      creditosCarregados,
      temCreditos: (id) => Boolean(CreditosMedia?.obter?.(id))
    });
    const lista = el("div", "media-quality-list");
    if (!resultado.problemas.length) {
      lista.append(el("span", "media-quality-chip ok", "Sem problemas detectados"));
    } else {
      resultado.problemas.forEach((p) => lista.append(el("span", `media-quality-chip ${p.severidade}`, p.mensagem)));
    }
    container.append(lista);
  }

  function configurarPlayer(mediaId, inicio) {
    const video = document.getElementById("mediaPlayer");
    const status = document.getElementById("mediaPlayerStatus");
    const montado = MediaPlayer.montar(video, mediaId, inicio, {
      onError: () => {
        if (!status) return;
        status.textContent = "Não foi possível carregar a pré-visualização deste Media ID. Os metadados continuam disponíveis.";
        status.classList.add("is-error");
      }
    });

    if (!montado && status) {
      status.textContent = window.location.protocol === "https:"
        ? "Pré-visualização indisponível neste acesso seguro. É necessário configurar o proxy HTTPS interno de vídeo; os metadados continuam disponíveis."
        : "Não foi possível montar a pré-visualização deste Media ID. Os metadados continuam disponíveis.";
      status.classList.add("is-error");
    }
    return video;
  }

  async function inicializar() {
    const params = new URLSearchParams(window.location.search);
    const mediaId = MediaIdUtils.normalizar(params.get("id") || "");
    const inicio = MediaPlayer.normalizarInicio(params.get("t"));

    if (!mediaId) {
      definirEstado("Media ID inválido.", "is-error");
      return;
    }

    let creditosCarregados = false;
    try {
      await DadosMedia.carregarCSV();
    } catch (erro) {
      console.error(erro);
      definirEstado("Não foi possível carregar o acervo.", "is-error");
      return;
    }

    const registro = DadosMedia.buscarPorMediaId(mediaId);
    if (!registro) {
      definirEstado("Media ID não encontrado no acervo.", "is-error");
      return;
    }

    await MediaEnrichment.carregar();
    if (typeof CreditosMedia !== "undefined") {
      try {
        await CreditosMedia.carregar();
        creditosCarregados = true;
      } catch (erro) {
        console.warn("Créditos não verificados nesta ficha:", erro);
      }
    }

    definirEstado("");
    document.title = `${mediaId} - Catálogo de Mídias`;
    document.getElementById("mediaTitle").textContent = `Media ID ${mediaId}`;
    document.getElementById("breadcrumbMediaId").textContent = mediaId;
    document.getElementById("mediaDescription").textContent = valorOuTraco(registro.DESCRICAO);

    const copyButton = document.getElementById("copyMediaId");
    copyButton.addEventListener("click", () => copiarTexto(mediaId).then(() => {
      copyButton.title = "Media ID copiado";
      window.setTimeout(() => { copyButton.title = "Copiar Media ID"; }, 1200);
    }));

    renderMetadata(registro);
    const enrichment = MediaEnrichment.obter(mediaId) || {};
    renderTags(enrichment);
    const video = configurarPlayer(mediaId, inicio);
    renderSegments(MediaEnrichment.obterSegmentos(mediaId), video);
    renderCredits(mediaId, creditosCarregados);
    renderRelated(registro, mediaId);
    renderQuality(registro, mediaId, creditosCarregados);
  }

  return { inicializar };
})();

document.addEventListener("DOMContentLoaded", MediaDetail.inicializar);
