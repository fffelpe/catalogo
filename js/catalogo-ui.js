// Substitua pela URL gerada no seu Google Apps Script
const URL_API_GOOGLE = "https://script.google.com/macros/s/AKfycbwI7WxYaycM0XhIMxPgCVlF4fP7jnGaQdbNvZMyrspiC4JPqBh_ufWmp3ItHJNrvL8v/exec";

document.addEventListener('DOMContentLoaded', () => {
  const inputBusca = document.getElementById('input-busca');
  const container = document.getElementById('grid-resultados') || document.getElementById('lista-resultados'); // Conforme o seu resultado-busca.html
  const loader = document.getElementById('loader') || document.getElementById('loading');
  
  async function pesquisarMidia(termo) {
    if (loader) loader.style.display = 'block';
    
    try {
      const resposta = await fetch(`${URL_API_GOOGLE}?q=${encodeURIComponent(termo)}`, {
        method: 'GET',
        redirect: 'follow' 
      });
      
      const dados = await resposta.json();
      renderizar(dados);
    } catch (erro) {
      console.error("Erro na busca:", erro);
      if (container) container.innerHTML = '<p class="erro">Falha ao se conectar com o banco de imagens. Tente novamente.</p>';
    } finally {
      if (loader) loader.style.display = 'none';
    }
  }

  function renderizar(itens) {
    if (!container) return;
    container.innerHTML = '';
    
    if (itens.length === 0) {
      container.innerHTML = '<p class="aviso">Nenhuma mídia encontrada para os termos pesquisados.</p>';
      return;
    }

    itens.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card-midia'; // Classe baseada no seu main.css
      card.innerHTML = `
        <div class="card-topo">
          <span class="badge id-badge"><strong>ID:</strong> ${item.id}</span>
          <span class="badge data-badge"><strong>Data:</strong> ${item.data}</span>
        </div>
        <div class="card-corpo">
          <p class="descricao-texto"><strong>Descrição:</strong> ${item.descricao}</p>
        </div>
        <div class="card-rodape">
          <span><strong>Local:</strong> ${item.local}</span>
          <span><strong>Repórter:</strong> ${item.reporter}</span>
          <span class="badge programa-badge"><strong>Programa:</strong> ${item.programa}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // Busca acionada ao apertar Enter
  if (inputBusca) {
    inputBusca.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const termo = e.target.value.trim();
        pesquisarMidia(termo);
      }
    });
  }
});