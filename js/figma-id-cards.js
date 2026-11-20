// Aplica a estrutura do card Figma aos resultados já renderizados pelo catálogo.
// Não altera filtros, pesquisa ou dados; não carrega vídeos.
(() => {
  "use strict";
  const IDS_TABELAS = ["resultsBody", "mamAgroBody", "tbodyVtsAgro"];
  const CAMPOS = {
    data: ['td[data-label="Data"]','td[data-label="DATA"]'],
    local: ['td[data-label="Local"]','td[data-label="LOCAL"]'],
    reporter: ['td[data-label="Repórter"]','td[data-label="REPÓRTER"]','td[data-label="Reporter"]'],
    programa: ['td[data-label="Programa"]','td[data-label="PROGRAMA"]'],
    editoria: ['td[data-label="Editoria"]','td[data-label="EDITORIA"]'],
    afiliada: ['td[data-label="Afiliada / Emissora"]','td[data-label="AFILIADA / EMISSORA"]']
  };
  let modal = null;
  let ultimoFoco = null;

  function campo(tr, seletores) {
    return seletores.map((s) => tr.querySelector(s)).find(Boolean) || null;
  }

  function idsDaLinha(tr) {
    const brutos = [];
    tr.querySelectorAll('.btn-copiar-id[data-ids]').forEach((b) => brutos.push(b.dataset.ids || ""));
    tr.querySelectorAll('.id-media-link').forEach((a) => brutos.push(a.textContent || ""));
    const ids = [];
    for (const valor of brutos) {
      const itens = typeof MediaIdUtils !== "undefined" && typeof MediaIdUtils.extrair === "function"
        ? MediaIdUtils.extrair(valor)
        : String(valor).toUpperCase().match(/\d{4}[A-Z]\d{5,6}/g) || [];
      for (const item of itens) if (!ids.includes(item)) ids.push(item);
    }
    return ids;
  }

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function tituloDaDescricao(descricao) {
    const partes = texto(descricao).split(/\s*(?:\+|\/\/|;)\s*/).filter(Boolean);
    const titulo = partes[0] || "MATÉRIA SEM TÍTULO";
    return titulo.length <= 88 ? titulo : titulo.slice(0, 85).trimEnd() + "…";
  }

  function preencherAusente(tr, nome, rotulo) {
    let celula = campo(tr, CAMPOS[nome]);
    if (!celula) {
      celula = document.createElement("td");
      celula.dataset.label = rotulo;
      celula.textContent = "—";
      tr.appendChild(celula);
    }
    if (!texto(celula.textContent)) celula.textContent = "—";
    celula.classList.add("figma-campo-" + nome);
    return celula;
  }

  function decorar(tr) {
    if (!tr || tr.dataset.figmaCardPronto === "1") return;
    if (tr.querySelector("td[colspan]") && tr.querySelectorAll("td").length === 1) return;
    if (!tr.querySelectorAll("td").length) return;
    const celulaDescricao = campo(tr, ['td[data-label="Descrição"]','td[data-label="DESCRIÇÃO"]','td[data-label="Descricao"]','td[data-label="DESCRICAO"]']);
    const descricao = celulaDescricao?.querySelector(".descricao-resultado");
    if (!descricao) return;
    const valorOriginal = texto(descricao.dataset.descricaoCompleta || descricao.textContent);
    const tituloOriginal = texto(descricao.dataset.tituloEditorial);
    descricao.dataset.descricaoCompleta = valorOriginal;
    // A área de descrição mantém o conteúdo completo já existente no catálogo.
    descricao.textContent = valorOriginal || "Descrição não disponível.";
    const titulo = document.createElement("td");
    titulo.className = "figma-card-heading";
    titulo.dataset.label = "Título";
    titulo.textContent = tituloOriginal ||
      (typeof TitulosContextuais !== "undefined"
        ? TitulosContextuais.resumir(valorOriginal) : tituloDaDescricao(valorOriginal));
    if (descricao.dataset.tituloModo === "busca") {
      titulo.title = "Título adaptado à pesquisa. Descrição original abaixo.";
      titulo.setAttribute("aria-description", "Título adaptado aos termos pesquisados");
    }
    tr.prepend(titulo);
    tr.classList.add("figma-id-card");
    preencherAusente(tr, "data", "Data");
    preencherAusente(tr, "local", "Local");
    preencherAusente(tr, "reporter", "Repórter");
    preencherAusente(tr, "programa", "Programa");
    preencherAusente(tr, "editoria", "Editoria");
    preencherAusente(tr, "afiliada", "Afiliada / Emissora");
    let duracao = tr.querySelector(".resultado-duracao");
    if (!duracao) {
      duracao = document.createElement("td");
      duracao.className = "resultado-duracao";
      duracao.dataset.label = "Duração";
      const id = idsDaLinha(tr)[0];
      const dado = id && typeof DadosMedia !== "undefined" ? DadosMedia.buscarPorMediaId?.(id) : null;
      duracao.textContent = dado?.DURACAO || "—";
      tr.appendChild(duracao);
    }
    let rodape = tr.querySelector(".resultado-rodape");
    if (!rodape) {
      rodape = document.createElement("td");
      rodape.className = "resultado-rodape";
      rodape.dataset.label = "Ações";
      tr.appendChild(rodape);
    }
    let slot = rodape.querySelector(".resultado-creditos-slot");
    if (!slot) {
      slot = document.createElement("span");
      slot.className = "resultado-creditos-slot";
      rodape.prepend(slot);
    }
    if (!slot.querySelector(".figma-creditos-trigger")) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "figma-creditos-trigger";
      botao.textContent = "VER CRÉDITOS";
      botao.setAttribute("aria-haspopup", "dialog");
      botao.dataset.ids = idsDaLinha(tr).join(",");
      slot.appendChild(botao);
    }
    tr.dataset.figmaCardPronto = "1";
  }

  function observar(body) {
    if (!body) return;
    body.querySelectorAll("tr").forEach(decorar);
    new MutationObserver((alteracoes) => {
      for (const alt of alteracoes) {
        for (const node of alt.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.("tr")) decorar(node);
          else if (node.closest?.("tr")) decorar(node.closest("tr"));
          node.querySelectorAll?.("tr").forEach(decorar);
        }
      }
    }).observe(body, {childList: true, subtree: true});
  }

  function elemento(tag, classe, conteudo) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (conteudo != null) el.textContent = conteudo;
    return el;
  }

  function detalhe(corpo, rotulo, valor) {
    if (!valor || (Array.isArray(valor) && !valor.length)) return;
    const grupo = elemento("div", "figma-dialog-field");
    grupo.append(elemento("b", "", rotulo));
    grupo.append(elemento("span", "", Array.isArray(valor) ? valor.join(", ") : String(valor)));
    corpo.appendChild(grupo);
  }

  function criarModal() {
    const dialog = elemento("dialog", "figma-creditos-dialog");
    dialog.setAttribute("aria-label", "Créditos da matéria");
    const topo = elemento("div", "figma-dialog-top");
    const titulo = elemento("div");
    titulo.append(elemento("strong", "", "CRÉDITOS DA MATÉRIA"));
    titulo.append(elemento("small", "figma-dialog-subtitle", ""));
    const fechar = elemento("button", "figma-dialog-close", "×");
    fechar.type = "button";
    fechar.setAttribute("aria-label", "Fechar créditos");
    fechar.addEventListener("click", () => dialog.close());
    topo.append(titulo, fechar);
    const corpo = elemento("div", "figma-dialog-body");
    dialog.append(topo, corpo);
    dialog.addEventListener("click", (evento) => {
      if (evento.target === dialog) {
        const caixa = dialog.getBoundingClientRect();
        if (evento.clientX < caixa.left || evento.clientX > caixa.right || evento.clientY < caixa.top || evento.clientY > caixa.bottom) dialog.close();
      }
    });
    dialog.addEventListener("close", () => ultimoFoco?.focus?.());
    document.body.appendChild(dialog);
    return dialog;
  }

  function mostrarCredito(corpo, item) {
    corpo.append(elemento("div", "figma-dialog-id", "ID: " + item.id));
    const dados = item.dados || {};
    if (dados.materia) detalhe(corpo, "MATÉRIA", dados.materia);
    for (const fonte of Array.isArray(dados.fontes) ? dados.fontes : []) {
      if (fonte?.nome) detalhe(corpo, "FONTE", fonte.nome + (fonte.cargo ? " — " + fonte.cargo : ""));
    }
    const rotulos = {
      credito: "CRÉDITO", roteiroProducao: "ROTEIRO E PRODUÇÃO", producao: "PRODUÇÃO",
      reportagem: "REPORTAGEM", imagens: "IMAGENS", camera: "CÂMERA",
      drone: "DRONE", edicao: "EDIÇÃO", arte: "ARTE", finalizacao: "FINALIZAÇÃO"
    };
    Object.entries(dados.creditos || {}).forEach(([chave, valor]) => detalhe(corpo, rotulos[chave] || chave, valor));
  }

  async function abrirCreditos(botao) {
    const ids = texto(botao.dataset.ids).split(",").filter(Boolean);
    if (!modal) modal = criarModal();
    const corpo = modal.querySelector(".figma-dialog-body");
    const subtitulo = modal.querySelector(".figma-dialog-subtitle");
    corpo.replaceChildren(elemento("p", "figma-dialog-empty", "Carregando créditos..."));
    subtitulo.textContent = ids.length ? "MEDIA ID: " + ids.join(", ") : "MEDIA ID NÃO IDENTIFICADO";
    ultimoFoco = botao;
    if (!modal.open) modal.showModal();
    try {
      if (typeof CreditosMedia !== "undefined") {
        await CreditosMedia.carregar();
        const registros = CreditosMedia.obterVarios(ids);
        if (!modal.open) return;
        corpo.replaceChildren();
        if (registros.length) registros.forEach((item) => mostrarCredito(corpo, item));
        else corpo.append(elemento("p", "figma-dialog-empty", "Créditos não disponíveis para este ID."));
      } else {
        corpo.replaceChildren(elemento("p", "figma-dialog-empty", "Créditos não disponíveis para este ID."));
      }
    } catch (erro) {
      if (modal.open) corpo.replaceChildren(elemento("p", "figma-dialog-empty", "Não foi possível carregar os créditos."));
      console.warn("Falha no carregamento dos créditos:", erro);
    }
  }

  function iniciar() {
    IDS_TABELAS.forEach((id) => observar(document.getElementById(id)));
    document.addEventListener("click", (evento) => {
      const botao = evento.target.closest?.(".figma-creditos-trigger");
      if (botao) abrirCreditos(botao);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
