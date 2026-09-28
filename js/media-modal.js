// media-modal.js
// Exibe os detalhes completos de um Media ID sem retirar o usuário da listagem.
// O link original para media.html é preservado como fallback quando JavaScript não está disponível.

const MediaModal = (() => {
  let backdrop = null;
  let dialog = null;
  let conteudo = null;
  let titulo = null;
  let fecharBotao = null;
  let elementoAnterior = null;
  let tokenAbertura = 0;

  const texto = (valor) => String(valor ?? "").trim();
  const valorOuTraco = (valor) => texto(valor) || "—";

  function el(tag, classe, valor) {
    const node = document.createElement(tag);
    if (classe) node.className = classe;
    if (valor != null) node.textContent = String(valor);
    return node;
  }

  function normalizarPrograma(valor) {
    return texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  }

  function programaTemEpisodio(programa) {
    const normalizado = normalizarPrograma(programa);
    return normalizado === "AGROCULTURA" || normalizado === "REPORTER ECO";
  }

  function criarEstrutura() {
    if (backdrop) return;

    backdrop = el("div", "media-modal-backdrop");
    backdrop.hidden = true;

    dialog = el("section", "media-modal-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "mediaModalTitulo");
    dialog.setAttribute("aria-describedby", "mediaModalDescricao");
    dialog.tabIndex = -1;

    const cabecalho = el("header", "media-modal-cabecalho");
    const tituloWrap = el("div", "media-modal-titulo-wrap");
    tituloWrap.append(el("span", "media-modal-eyebrow", "Detalhes do Media ID"));
    titulo = el("h2", "media-modal-titulo", "Media ID");
    titulo.id = "mediaModalTitulo";
    tituloWrap.append(titulo);

    fecharBotao = el("button", "media-modal-fechar", "×");
    fecharBotao.type = "button";
    fecharBotao.setAttribute("aria-label", "Fechar detalhes");
    fecharBotao.title = "Fechar";

    cabecalho.append(tituloWrap, fecharBotao);

    conteudo = el("div", "media-modal-conteudo");
    conteudo.id = "mediaModalDescricao";

    dialog.append(cabecalho, conteudo);
    backdrop.append(dialog);
    document.body.append(backdrop);

    fecharBotao.addEventListener("click", fechar);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) fechar();
    });
  }

  function definirCarregando(mediaId) {
    titulo.textContent = `Media ID ${mediaId}`;
    conteudo.textContent = "";
    const estado = el("div", "media-modal-estado");
    estado.append(el("span", "media-modal-spinner"));
    estado.append(el("span", "", "Carregando detalhes..."));
    conteudo.append(estado);
  }

  function definirErro(mensagem) {
    conteudo.textContent = "";
    conteudo.append(el("div", "media-modal-estado media-modal-erro", mensagem));
  }

  function copiarTexto(valor) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(valor);
    const area = document.createElement("textarea");
    area.value = valor;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    return Promise.resolve();
  }

  function criarTopo(registro, mediaId) {
    const bloco = el("div", "media-modal-topo");
    const idArea = el("div", "media-modal-id-area");
    const idTexto = el("strong", "media-modal-id", mediaId);
    const copiar = el("button", "media-modal-copiar");
    copiar.type = "button";
    copiar.setAttribute("aria-label", `Copiar Media ID ${mediaId}`);
    copiar.title = "Copiar Media ID";

    const icone = document.createElement("img");
    icone.src = "../images/copiar.png?v=4";
    icone.alt = "";
    icone.setAttribute("aria-hidden", "true");
    copiar.append(icone);

    copiar.addEventListener("click", () => {
      copiarTexto(mediaId).then(() => {
        copiar.title = "Media ID copiado";
        copiar.classList.add("copiado");
        window.setTimeout(() => {
          copiar.title = "Copiar Media ID";
          copiar.classList.remove("copiado");
        }, 1200);
      });
    });

    idArea.append(idTexto, copiar);
    bloco.append(idArea);

    if (registro.PROGRAMA) bloco.append(el("span", "media-modal-programa", registro.PROGRAMA));
    return bloco;
  }

  function criarMetadata(registro) {
    const secao = el("section", "media-modal-secao");
    secao.append(el("h3", "media-modal-subtitulo", "Informações"));

    const grid = el("div", "media-modal-metadata");
    const campos = [
      ["Data", registro.DATA],
      ["Duração", registro.DURACAO],
      ["Programa", registro.PROGRAMA],
      ["Editoria", registro.EDITORIA],
      ["Local", registro.LOCAL],
      ["Repórter", registro.REPORTER],
      ["Afiliada / Emissora", registro.AFILIADA_EMISSORA]
    ];

    if (programaTemEpisodio(registro.PROGRAMA)) campos.push(["Episódio", registro.PGM]);

    campos.forEach(([rotulo, valor]) => {
      const item = el("div", "media-modal-meta-item");
      item.append(el("span", "media-modal-meta-label", rotulo));
      item.append(el("span", "media-modal-meta-value", valorOuTraco(valor)));
      grid.append(item);
    });

    secao.append(grid);
    return secao;
  }

  function criarDescricao(registro) {
    const secao = el("section", "media-modal-secao media-modal-descricao");
    secao.append(el("h3", "media-modal-subtitulo", "Descrição"));
    secao.append(el("p", "", valorOuTraco(registro.DESCRICAO)));
    return secao;
  }

  function criarTags(enrichment) {
    const secao = el("section", "media-modal-secao");
    secao.append(el("h3", "media-modal-subtitulo", "Palavras-chave e assuntos"));

    const tags = [
      ...(enrichment?.subjects || []),
      ...(enrichment?.keywords || []),
      ...(enrichment?.people || []),
      ...(enrichment?.places || [])
    ];
    const unicos = [...new Set(tags.map((tag) => texto(tag)).filter(Boolean))];

    if (!unicos.length) {
      secao.append(el("p", "media-modal-vazio", "Nenhuma palavra-chave enriquecida para este Media ID."));
      return secao;
    }

    const lista = el("div", "media-modal-tags");
    unicos.forEach((tag) => lista.append(el("span", "media-modal-tag", tag)));
    secao.append(lista);
    return secao;
  }

  function criarSegmentos(segmentos) {
    const secao = el("section", "media-modal-secao");
    secao.append(el("h3", "media-modal-subtitulo", "Trechos indexados"));

    if (!segmentos.length) {
      secao.append(el("p", "media-modal-vazio", "Nenhum trecho indexado para este vídeo."));
      return secao;
    }

    const lista = el("div", "media-modal-segmentos");
    segmentos.forEach((segmento) => {
      const item = el("div", "media-modal-segmento");
      const timecode = typeof MediaSegments !== "undefined" && MediaSegments.formatarTimecode
        ? MediaSegments.formatarTimecode(segmento.start)
        : valorOuTraco(segmento.start);
      item.append(el("span", "media-modal-timecode", timecode));
      item.append(el("span", "media-modal-segmento-texto", valorOuTraco(segmento.text)));
      lista.append(item);
    });
    secao.append(lista);
    return secao;
  }

  function criarCreditos(mediaId, creditosCarregados) {
    if (!creditosCarregados || typeof CreditosMedia === "undefined") return null;
    const dados = CreditosMedia.obter(mediaId);
    if (!dados) return null;

    const secao = el("section", "media-modal-secao");
    secao.append(el("h3", "media-modal-subtitulo", "Créditos"));
    const grid = el("div", "media-modal-creditos");

    const adicionar = (rotulo, valor) => {
      if (!valor || (Array.isArray(valor) && !valor.length)) return;
      const item = el("div", "media-modal-credito-item");
      item.append(el("span", "media-modal-meta-label", rotulo));
      item.append(el("span", "media-modal-meta-value", Array.isArray(valor) ? valor.join(", ") : valor));
      grid.append(item);
    };

    adicionar("Matéria", dados.materia);
    Object.entries(dados.creditos || {}).forEach(([cargo, valor]) => adicionar(cargo, valor));
    if (Array.isArray(dados.fontes) && dados.fontes.length) {
      adicionar("Fontes", dados.fontes
        .map((fonte) => [fonte?.nome, fonte?.cargo].filter(Boolean).join(" — "))
        .filter(Boolean));
    }

    if (!grid.children.length) return null;
    secao.append(grid);
    return secao;
  }

  function renderizar(registro, mediaId, enrichment, segmentos, creditosCarregados) {
    conteudo.textContent = "";
    titulo.textContent = `Media ID ${mediaId}`;
    conteudo.append(criarTopo(registro, mediaId));
    conteudo.append(criarMetadata(registro));
    conteudo.append(criarDescricao(registro));
    conteudo.append(criarTags(enrichment));
    conteudo.append(criarSegmentos(segmentos));

    const creditos = criarCreditos(mediaId, creditosCarregados);
    if (creditos) conteudo.append(creditos);
  }

  async function abrir(mediaId) {
    criarEstrutura();

    const normalizado = typeof MediaIdUtils !== "undefined"
      ? MediaIdUtils.normalizar(mediaId)
      : texto(mediaId).toUpperCase();
    if (!normalizado) return false;

    tokenAbertura += 1;
    const tokenAtual = tokenAbertura;
    elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    definirCarregando(normalizado);
    backdrop.hidden = false;
    document.body.classList.add("modal-aberto");
    fecharBotao.focus();

    try {
      if (typeof DadosMedia === "undefined") throw new Error("DadosMedia indisponível");
      if (typeof DadosMedia.carregarCSV === "function") await DadosMedia.carregarCSV();
      if (tokenAtual !== tokenAbertura) return true;

      const registro = DadosMedia.buscarPorMediaId(normalizado);
      if (!registro) {
        definirErro("Media ID não encontrado no acervo.");
        return true;
      }

      let enrichment = {};
      if (typeof MediaEnrichment !== "undefined") {
        try {
          await MediaEnrichment.carregar();
          enrichment = MediaEnrichment.obter(normalizado) || {};
        } catch (erro) {
          console.warn("Enriquecimento indisponível no modal:", erro);
        }
      }

      let creditosCarregados = false;
      if (typeof CreditosMedia !== "undefined") {
        try {
          await CreditosMedia.carregar();
          creditosCarregados = true;
        } catch (erro) {
          console.warn("Créditos indisponíveis no modal:", erro);
        }
      }

      if (tokenAtual !== tokenAbertura) return true;
      const segmentos = typeof MediaEnrichment !== "undefined" && MediaEnrichment.obterSegmentos
        ? MediaEnrichment.obterSegmentos(normalizado)
        : [];

      renderizar(registro, normalizado, enrichment, segmentos, creditosCarregados);
      dialog.focus();
      return true;
    } catch (erro) {
      console.error("Erro ao abrir detalhes do Media ID:", erro);
      definirErro("Não foi possível carregar os detalhes deste Media ID.");
      return true;
    }
  }

  function fechar() {
    if (!backdrop || backdrop.hidden) return;
    tokenAbertura += 1;
    backdrop.hidden = true;
    document.body.classList.remove("modal-aberto");
    const anterior = elementoAnterior;
    elementoAnterior = null;
    if (anterior && document.contains(anterior)) anterior.focus();
  }

  function elementosFocaveis() {
    if (!dialog) return [];
    return [...dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((item) => !item.hidden && item.offsetParent !== null);
  }

  function aoTeclar(event) {
    if (!backdrop || backdrop.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      fechar();
      return;
    }

    if (event.key !== "Tab") return;
    const focaveis = elementosFocaveis();
    if (!focaveis.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  document.addEventListener("keydown", aoTeclar);

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.(".resultado-detalhes");
    if (!link) return;

    const mediaId = link.dataset.mediaId || (() => {
      try {
        return new URL(link.href, window.location.href).searchParams.get("id") || "";
      } catch {
        return "";
      }
    })();

    if (!mediaId || typeof DadosMedia === "undefined") return;
    event.preventDefault();
    abrir(mediaId);
  });

  return { abrir, fechar };
})();
