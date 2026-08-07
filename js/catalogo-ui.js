// Substitua o conteúdo no seu arquivo js/catalogo-ui.js

const URL_API_GOOGLE = "https://script.google.com/d/1a_iQeDkuS2OE--nFpY88qYkf3KHqD7l3d3R4LxgjaCqksJMHYqslmXpS/edit?usp=sharing";

document.addEventListener('DOMContentLoaded', () => {
  const inputBusca = document.getElementById('input-busca');
  const container = document.getElementById('grid-resultados');
  const loader = document.getElementById('loader');

  async function pesquisarMídia(termo) {
    if (loader) loader.style.display = 'block';
    
    try {
      const resposta = await fetch(`${URL_API_GOOGLE}?q=${encodeURIComponent(termo)}`);
      const dados = await resposta.json();
      
      renderizar(dados);
    } catch (erro) {
      console.error("Erro ao buscar dados na API:", erro);
      container.innerHTML = '<p>Erro ao carregar o catálogo. Tente novamente.</p>';
    } finally {
      if (loader) loader.style.display = 'none';
    }
  }

  function renderizar(itens) {
    container.innerHTML = '';
    if (itens.length === 0) {
      container.innerHTML = '<p>Nenhum resultado encontrado.</p>';
      return;
    }

    itens.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card-midia';
      card.innerHTML = `
        <div class="card-topo"><strong>ID:</strong> ${item.id} | <strong>Data:</strong> ${item.data}</div>
        <div class="card-corpo"><p>${item.descricao}</p></div>
        <div class="card-rodape"><strong>Repórter:</strong> ${item.reporter} | <strong>Local:</strong> ${item.local}</div>
      `;
      container.appendChild(card);
    });
  }

  // Pesquisa automaticamente ao digitar
  let timeoutId;
  inputBusca.addEventListener('input', (e) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      pesquisarMídia(e.target.value);
    }, 500); // Aguarda 500ms para evitar requisições desnecessárias enquanto o usuário digita
  });
});