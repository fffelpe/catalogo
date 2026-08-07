// catalogo-ui.js - Gerencia a renderização no DOM

let resultadosAtuais = [];
let paginaAtual = 0;
const ITENS_POR_PAGINA = 50;

// Função Debounce para não travar enquanto o usuário digita
function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

async function inicializarBusca() {
    // Pega o termo da URL (ex: resultado-busca.html?q=capivara)
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.value = query;

    // Mostra um loading visual (se existir a div)
    const container = document.getElementById('resultsContainer');
    if(container) container.innerHTML = '<p>Carregando acervo do imgs.csv...</p>';

    // Carrega os dados
    await DadosMedia.carregarCSV();
    
    // Faz a busca inicial
    executarBusca(query);

    // Configura o evento de digitação na barra de busca (se ela existir na página de resultados)
    if(searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            executarBusca(e.target.value);
        }));
    }
    
    // Configura o botão de "Carregar Mais"
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if(loadMoreBtn) {
        loadMoreBtn.addEventListener('click', renderizarProximaPagina);
    }
}

function executarBusca(termo) {
    resultadosAtuais = DadosMedia.buscar(termo);
    paginaAtual = 0;
    
    const container = document.getElementById('resultsContainer');
    if(container) container.innerHTML = ''; // Limpa os resultados anteriores
    
    renderizarProximaPagina();
}

function renderizarProximaPagina() {
    const container = document.getElementById('resultsContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if(!container) return;

    const inicio = paginaAtual * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const itensParaRenderizar = resultadosAtuais.slice(inicio, fim);

    if (itensParaRenderizar.length === 0 && paginaAtual === 0) {
        container.innerHTML = '<p>Nenhum resultado encontrado no imgs.csv.</p>';
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    // AQUI VOCÊ MANTÉM SUA ESTRUTURA DE CLASSES CSS INTACTA
    // Substitua as classes abaixo pelas classes reais que você usa no seu layout
    itensParaRenderizar.forEach(item => {
        const card = document.createElement('div');
        card.className = 'seu-card-css-aqui'; // <-- Mantenha a classe original do seu layout
        
        card.innerHTML = `
            <h3>ID: ${item.ID}</h3>
            <p>${item.DESCRIÇÃO}</p>
            <small>Data: ${item.DATA} | Programa: ${item.PROGRAMA}</small>
        `;
        container.appendChild(card);
    });

    paginaAtual++;

    // Mostra ou esconde o botão de carregar mais
    if(loadMoreBtn) {
        loadMoreBtn.style.display = (fim < resultadosAtuais.length) ? 'block' : 'none';
    }
}

// Inicia o script quando a página carregar
document.addEventListener('DOMContentLoaded', inicializarBusca);