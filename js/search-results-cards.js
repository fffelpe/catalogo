// search-results-cards.js
// Transforma as linhas das tabelas do catálogo em cards editoriais compactos.
// Preserva filtros, créditos, cópia de Media IDs e links das fichas individuais.

(function () {
  const BODY_IDS = ["resultsBody", "mamAgroBody", "tbodyVtsAgro"];

  const MAPA_CLASSES = {
    "Descrição": "resultado-titulo",
    "DESCRIÇÃO": "resultado-titulo",
    "Descricao": "resultado-titulo",
    "DESCRICAO": "resultado-titulo",
    "Data": "resultado-data",
    "DATA": "resultado-data",
    "Local": "resultado-local",
    "LOCAL": "resultado-local",
    "Repórter": "resultado-reporter",
    "REPÓRTER": "resultado-reporter",
    "Reporter": "resultado-reporter",
    "REPORTER": "resultado-reporter",
    "Afiliada / Emissora": "resultado-meta-oculto-card",
    "Programa": "resultado-programa-badge",
    "PROGRAMA": "resultado-programa-badge",
    "Editoria": "resultado-meta-oculto-card",
    "EDITORIA": "resultado-meta-oculto-card",
    "PGM": "resultado-meta-oculto-card"
  };

  const CAMPOS_VISIVEIS = new Set([
    "Data", "DATA", "Local", "LOCAL", "Repórter", "REPÓRTER", "Reporter", "REPORTER"
  ]);

  function textoVisivel(elemento) {
    return String(elemento?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function resumirDescricao(texto, limite = 78) {
    const limpo = String(texto || "").replace(/\s+/g, " ").trim();
    if (!limpo || limpo === "—") return "Sem descrição";

    const primeiraFrase = limpo.match(/^(.{12,}?[.!?])(?:\s|$)/)?.[1] || limpo;
    if (primeiraFrase.length <= limite) return primeiraFrase;

    const corte = primeiraFrase.slice(0, limite + 1);
    const ultimoEspaco = corte.lastIndexOf(" ");
    const resumo = (ultimoEspaco > Math.floor(limite * 0.65)
      ? corte.slice(0, ultimoEspaco)
      : corte.slice(0, limite)).trim();

    return `${resumo.replace(/[,:;.!?]+$/, "")}…`;
  }

  function gerarTituloEditorialLocal(descricao) {
    const chunks = String(descricao || "")
      .replace(/\s+/g, " ")
      .trim()
      .split(/\s*(?:\+|\|+|\/{2,}|;)\s*/g)
      .map((parte) => parte
        .replace(/^(?:GERAIS?|COPI[AÃ]O|IMAGENS?|TAKES?|SONORA|OFF|ARQUIVO|A[EÉ]REAS?)\s+(?:DE\s+|DA\s+|DO\s+|EM\s+)?/i, "")
        .trim())
      .filter((parte) => parte.length >= 4);

    if (!chunks.length) return resumirDescricao(descricao);

    const escolhidos = [];
    const vistos = [];
    for (const chunk of chunks) {
      const chave = chunk.toLocaleLowerCase("pt-BR");
      if (vistos.some((item) => item === chave || item.includes(chave) || chave.includes(item))) continue;
      vistos.push(chave);
      escolhidos.push(chunk);
      if (escolhidos.length >= 2) break;
    }

    const titulo = escolhidos.join(" — ") || chunks[0];
    const normalizado = titulo.toLocaleLowerCase("pt-BR");
    const formatado = normalizado
      ? normalizado[0].toLocaleUpperCase("pt-BR") + normalizado.slice(1)
      : "";
    return resumirDescricao(formatado, 88);
  }

  function prepararTitulo(td) {
    if (!td) return;

    let alvo = td.querySelector(".descricao-resultado");
    if (!alvo) {
      const textoDireto = Array.from(td.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => String(node.textContent || "").trim())
        .filter(Boolean)
        .join(" ");

      alvo = document.createElement("span");
      alvo.className = "descricao-resultado";
      alvo.textContent = textoDireto || "Sem descrição";

      Array.from(td.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .forEach((node) => node.remove());
      td.prepend(alvo);
    }

    const descricaoCompleta = alvo.dataset.descricaoCompleta || textoVisivel(alvo);
    if (!descricaoCompleta) return;

    const tr = td.closest("tr");
    const mediaId = tr ? primeiroMediaId(tr) : "";
    const tituloEnriquecido = mediaId && typeof MediaEnrichment !== "undefined"
      ? String(MediaEnrichment.obter?.(mediaId)?.title || "").trim()
      : "";
    const tituloEditorial = tituloEnriquecido || gerarTituloEditorialLocal(descricaoCompleta);

    alvo.dataset.descricaoCompleta = descricaoCompleta;
    alvo.dataset.tituloEditorial = tituloEditorial;
    alvo.title = descricaoCompleta;
    alvo.textContent = tituloEditorial;
  }

  function preencherCampoVazio(td, rotulo) {
    if (!td || !CAMPOS_VISIVEIS.has(rotulo)) return;
    if (!textoVisivel(td)) td.textContent = "—";
  }

  function marcarCelulas(tr) {
    tr.querySelectorAll("td[data-label]").forEach((td) => {
      const rotulo = td.getAttribute("data-label") || "";
      const classe = MAPA_CLASSES[rotulo];
      if (classe) td.classList.add(classe);
      if (classe === "resultado-titulo") prepararTitulo(td);
      preencherCampoVazio(td, rotulo);
    });

    const celulaId = tr.querySelector("td.id-cell") || tr.querySelector('td[data-label="ID"]') || tr.querySelector("td:first-child");
    if (celulaId) celulaId.classList.add("resultado-id");
  }

  function primeiroMediaId(tr) {
    const link = tr.querySelector(".id-media-link");
    if (link) return textoVisivel(link);

    const botao = tr.querySelector(".btn-copiar-id[data-ids]");
    const bruto = botao?.dataset.ids || "";
    if (typeof MediaIdUtils !== "undefined" && typeof MediaIdUtils.extrair === "function") {
      return MediaIdUtils.extrair(bruto)[0] || "";
    }
    return bruto.split(/[\r\n,;+\/|&]+/).map((id) => id.trim()).find(Boolean) || "";
  }

  function garantirPrograma(tr) {
    let celula = tr.querySelector('.resultado-programa-badge, td[data-label="Programa"], td[data-label="PROGRAMA"]');
    if (!celula) {
      celula = document.createElement("td");
      celula.setAttribute("data-label", "Programa");
      const bodyId = tr.parentElement?.id || "";
      celula.textContent = (bodyId === "mamAgroBody" || bodyId === "tbodyVtsAgro") ? "AGROCULTURA" : "CATÁLOGO";
      tr.appendChild(celula);
    }

    celula.classList.add("resultado-programa-badge");
    if (!textoVisivel(celula)) celula.textContent = "CATÁLOGO";
    return celula;
  }

  function garantirDuracao(tr) {
    let celula = tr.querySelector('.resultado-duracao, td[data-label="Duração"], td[data-label="DURACAO"], td[data-label="DURAÇÃO"]');
    if (!celula) {
      celula = document.createElement("td");
      celula.setAttribute("data-label", "Duração");
      tr.appendChild(celula);
    }

    celula.classList.add("resultado-duracao");
    if (textoVisivel(celula)) return celula;

    const mediaId = primeiroMediaId(tr);
    let duracao = "";
    if (mediaId && typeof DadosMedia !== "undefined" && typeof DadosMedia.buscarPorMediaId === "function") {
      try {
        duracao = String(DadosMedia.buscarPorMediaId(mediaId)?.DURACAO || "").trim();
      } catch (erro) {
        console.warn("Não foi possível obter a duração do Media ID:", mediaId, erro);
      }
    }

    celula.textContent = duracao || "—";
    return celula;
  }

  function criarRodape(tr) {
    let rodape = tr.querySelector(".resultado-rodape");
    if (rodape) return rodape;

    const linkId = tr.querySelector(".id-media-link[href]");
    if (!linkId) return null;

    const mediaId = primeiroMediaId(tr);
    rodape = document.createElement("td");
    rodape.className = "resultado-rodape";
    rodape.setAttribute("data-label", "Ações");

    const extras = document.createElement("span");
    extras.className = "resultado-creditos-slot";

    const link = document.createElement("a");
    link.className = "resultado-detalhes";
    link.href = mediaId ? `media.html?id=${encodeURIComponent(mediaId)}` : (linkId.getAttribute("href") || "#");
    if (mediaId) link.setAttribute("data-media-id", mediaId);
    link.setAttribute("aria-label", `Ver mais detalhes de ${mediaId || textoVisivel(linkId)}`);
    link.append(document.createTextNode("Veja mais"));

    const seta = document.createElement("span");
    seta.className = "resultado-detalhes-seta";
    seta.setAttribute("aria-hidden", "true");
    seta.textContent = "›";
    link.appendChild(seta);

    rodape.append(extras, link);
    tr.appendChild(rodape);
    return rodape;
  }

  function realocarCreditos(tr) {
    const rodape = tr.querySelector(".resultado-rodape") || criarRodape(tr);
    const slot = rodape?.querySelector(".resultado-creditos-slot");
    if (!slot) return;

    tr.querySelectorAll(".creditos-detalhes").forEach((detalhes) => {
      if (detalhes.closest(".resultado-creditos-slot")) return;
      const resumo = detalhes.querySelector("summary");
      if (resumo) resumo.textContent = "Com créditos";
      slot.appendChild(detalhes);
    });

    tr.querySelectorAll(".trecho-encontrado-wrap").forEach((trecho) => {
      if (trecho.closest(".resultado-creditos-slot")) return;
      slot.appendChild(trecho);
    });
  }

  function decorarLinha(tr) {
    if (!tr || tr.nodeType !== Node.ELEMENT_NODE) return;

    const celulas = tr.querySelectorAll("td");
    if (!celulas.length) return;

    if (celulas.length === 1 && celulas[0].hasAttribute("colspan")) {
      tr.classList.add("resultado-card-vazio");
      tr.dataset.resultadoCardProcessado = "1";
      return;
    }

    if (tr.dataset.resultadoCardProcessado !== "1") {
      marcarCelulas(tr);
      garantirPrograma(tr);
      garantirDuracao(tr);
      criarRodape(tr);

      const primeiroId = tr.querySelector(".id-media-link");
      if (primeiroId) tr.setAttribute("aria-label", `Resultado ${textoVisivel(primeiroId)}`);
      tr.dataset.resultadoCardProcessado = "1";
    }

    realocarCreditos(tr);
  }

  function decorarTabela(tbody) {
    tbody?.querySelectorAll("tr").forEach(decorarLinha);
  }

  function observarCards(bodyId) {
    const tbody = document.getElementById(bodyId);
    if (!tbody) return;

    decorarTabela(tbody);

    const observer = new MutationObserver((mutacoes) => {
      mutacoes.forEach((mutacao) => {
        mutacao.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const linha = node.matches?.("tr") ? node : node.closest?.("tr");
          if (linha) decorarLinha(linha);
          node.querySelectorAll?.("tr").forEach(decorarLinha);
        });
      });
    });

    observer.observe(tbody, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => BODY_IDS.forEach(observarCards));
})();
