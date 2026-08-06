// ============================================================
// CATALOGO-UI.JS - Lógica de Interface e Filtros
// ============================================================

// Variável global para armazenar a lista completa vinda do dados.js
let dadosCompletos = [];

// Helper para normalizar textos (remove acentos, espaços extras e converte para maiúsculas)
function normalizarTexto(texto) {
  if (!texto) return "";
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .trim()
    .toUpperCase();
}

// ------------------------------------------------------------
// 1. Inicialização e Carga dos Dados
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Carrega os dados processados pelo dados.js
    if (typeof carregarTodosOsDados === "function") {
      dadosCompletos = await carregarTodosOsDados();
      console.log(`[Catalogo] ${dadosCompletos.length} itens carregados.`);
    } else {
      console.error("[Catalogo] Função carregarTodosOsDados não encontrada.");
    }
  } catch (erro) {
    console.error("[Catalogo] Erro ao carregar dados:", erro);
  }

  // Configura os ouvintes de evento nos botões/links de programas
  configurarFiltrosPrograma();
});

// ------------------------------------------------------------
// 2. Filtro por Programa (Clique na Home / Menu)
// ------------------------------------------------------------
function filtrarPorPrograma(nomePrograma) {
  if (!dadosCompletos || dadosCompletos.length === 0) return [];

  const programaBuscado = normalizarTexto(nomePrograma);

  return dadosCompletos.filter(item => {
    if (!item.programa) return false;
    // Compara o programa do item com o termo clicado (ambos normalizados)
    return normalizarTexto(item.programa) === programaBuscado;
  });
}

// Configura os cliques nos cards/botões de programas
function configurarFiltrosPrograma() {
  // Captura qualquer elemento com a classe de clique do programa
  // (Adapte '.btn-programa' para a classe usada nas suas tags de link/card se for diferente)
  const botoes = document.querySelectorAll(".btn-programa, [data-programa]");

  botoes.forEach(elemento => {
    elemento.addEventListener("click", (event) => {
      event.preventDefault();

      // Pega a informação do atributo data-programa ou do texto do próprio elemento
      const programaClicado = elemento.dataset.programa || elemento.textContent;

      // Executa a busca
      const resultados = filtrarPorPrograma(programaClicado);

      console.log(`[Busca] Resultados para "${programaClicado}":`, resultados.length);

      // Renderiza os resultados na tela
      exibirResultados(resultados, programaClicado);
    });
  });
}

// ------------------------------------------------------------
// 3. Renderização dos Resultados na Tela
// ------------------------------------------------------------
function exibirResultados(lista, tituloFiltro = "") {
  // Ajuste o ID do container conforme o elemento existente no seu HTML
  const container = document.getElementById("resultados-container") || document.getElementById("resultados");
  
  if (!container) {
    console.warn("[Catalogo] Container de resultados não encontrado no HTML.");
    return;
  }

  container.innerHTML = ""; // Limpa os resultados anteriores

  if (!lista || lista.length === 0) {
    container.innerHTML = `
      <div class="sem-resultados">
        <p>Nenhum registro encontrado para <strong>${tituloFiltro}</strong>.</p>
      </div>
    `;
    return;
  }

  // Cria a listagem mantendo as classes compatíveis com o main.css
  const fragmento = document.createDocumentFragment();

  lista.forEach(item => {
    const card = document.createElement("div");
    card.className = "card-item"; // Mantém a classe original para herdar o main.css

    card.innerHTML = `
      <div class="card-header">
        <span class="badge-tipo">${item.tipo ? item.tipo.toUpperCase() : "MATÉRIA"}</span>
        <span class="card-id">ID: ${item.id}</span>
      </div>
      <div class="card-body">
        <h4>${item.assunto || "Sem assunto"}</h4>
        <p><strong>Programa:</strong> ${(item.programa || "").toUpperCase()}</p>
        ${item.reporter ? `<p><strong>Repórter:</strong> ${item.reporter}</p>` : ""}
        ${item.data ? `<p><strong>Data:</strong> ${item.data}</p>` : ""}
        ${item.local ? `<p><strong>Local:</strong> ${item.local}</p>` : ""}
      </div>
    `;

    fragmento.appendChild(card);
  });

  container.appendChild(fragmento);
}