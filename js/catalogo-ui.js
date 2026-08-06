// Funções usadas tanto em resultado-busca.html quanto em programa.html.
// Depende de dados.js (carregarTodosOsDados) já ter sido carregado antes.

const RÓTULOS_TIPO = {
  materia: "Matéria",
  imagem: "Imagem bruta",
  noticia: "Notícia",
};

// Filtra a lista de itens por um texto de busca livre, comparando com os
// principais campos (id, assunto, programa, repórter, local).
function filtrarItens(itens, textoBusca) {
  const termo = (textoBusca || "").trim().toLowerCase();
  if (!termo) return itens;
  return itens.filter((item) => {
    const alvo = [item.id, item.assunto, item.programa, item.pgm, item.reporter, item.local]
      .join(" ")
      .toLowerCase();
    return alvo.includes(termo);
  });
}

// Cria o HTML de uma linha/item da lista, com os botões Assistir e Copiar Media ID.
function criarItemHtml(item) {
  const linkPrograma = `programa.html?programa=${encodeURIComponent(item.programa)}&id=${encodeURIComponent(item.id)}`;
  const tipoLabel = RÓTULOS_TIPO[item.tipo] || item.tipo;
  return `
    <li class="item-midia" id="item-${item.id}">
      <span class="item-id">${item.id}</span>
      <span class="item-assunto">${item.assunto || "—"}</span>
      <span class="item-meta">${tipoLabel}${item.data ? " · " + item.data : ""}${item.local ? " · " + item.local : ""}${item.reporter ? " · " + item.reporter : ""}</span>
      <span class="item-acoes">
        <a href="${linkPrograma}">Assistir</a>
        <button type="button" data-copiar-id="${item.id}">Copiar Media ID</button>
      </span>
    </li>
  `;
}

// Renderiza uma lista de itens dentro de um elemento <ul>/<ol>/<section>.
function renderizarLista(container, itens) {
  if (!itens.length) {
    container.innerHTML = `<p class="pagina-status">Nenhum item encontrado.</p>`;
    return;
  }
  container.innerHTML = itens.map(criarItemHtml).join("");
  ativarBotoesCopiar(container);
}

// Liga o clique de todo botão "Copiar Media ID" dentro de um container.
function ativarBotoesCopiar(container) {
  container.querySelectorAll("[data-copiar-id]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const id = botao.getAttribute("data-copiar-id");
      try {
        await navigator.clipboard.writeText(id);
      } catch (erro) {
        // Fallback para navegadores/contextos sem permissão de clipboard.
        const campo = document.createElement("textarea");
        campo.value = id;
        document.body.appendChild(campo);
        campo.select();
        document.execCommand("copy");
        document.body.removeChild(campo);
      }
      const textoOriginal = botao.textContent;
      botao.textContent = "Copiado!";
      botao.classList.add("copiado");
      setTimeout(() => {
        botao.textContent = textoOriginal;
        botao.classList.remove("copiado");
      }, 1500);
    });
  });
}
