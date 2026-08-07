// js/catalogo-ui.js
import { buscarTodasAsMidias, filtrarMidias } from './dados.js';

document.addEventListener('DOMContentLoaded', async () => {
  const containerResultados = document.getElementById('lista-resultados') || document.getElementById('container-midias');
  const loader = document.getElementById('loader') || document.getElementById('loading');
  const inputBusca = document.getElementById('input-busca');
  
  const params = new URLSearchParams(window.location.search);
  const programaParam = params.get('programa') || params.get('nome');
  const buscaParam = params.get('q') || params.get('busca');

  function exibirLoader(ativo) {
    if (loader) loader.style.display = ativo ? 'block' : 'none';
  }

  function renderizarItens(itens) {
    if (!containerResultados) return;
    containerResultados.innerHTML = '';

    if (itens.length === 0) {
      containerResultados.innerHTML = `
        <div class="sem-resultados">
          <p>Nenhuma mídia ou ID foi localizado para esta pesquisa.</p>
        </div>
      `;
      return;
    }

    itens.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card-midia';
      card.innerHTML = `
        <div class="card-header">
          <span class="badge-id">${item.id}</span>
          <button class="btn-copiar" data-id="${item.id}">Copiar ID</button>
        </div>
        <h3>${item.titulo}</h3>
        <p><strong>Programa:</strong> ${item.programa}</p>
        ${item.data ? `<p><strong>Data:</strong> ${item.data}</p>` : ''}
        ${item.link && item.link !== '#' ? `<a href="${item.link}" target="_blank" rel="noopener">Acessar Mídia</a>` : ''}
      `;
      containerResultados.appendChild(card);
    });

    // Evento de copiar ID
    document.querySelectorAll('.btn-copiar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        navigator.clipboard.writeText(id);
        e.target.innerText = 'Copiado!';
        setTimeout(() => e.target.innerText = 'Copiar ID', 2000);
      });
    });
  }

  exibirLoader(true);
  try {
    const todasAsMidias = await buscarTodasAsMidias();
    const filtrados = filtrarMidias(todasAsMidias, buscaParam, programaParam);
    renderizarItens(filtrados);
  } catch (err) {
    console.error("Erro na interface:", err);
    if (containerResultados) {
      containerResultados.innerHTML = '<p class="erro">Ocorreu um erro ao carregar os dados. Tente novamente.</p>';
    }
  } finally {
    exibirLoader(false);
  }

  if (inputBusca) {
    inputBusca.addEventListener('input', async (e) => {
      const termo = e.target.value;
      const todasAsMidias = await buscarTodasAsMidias();
      const filtrados = filtrarMidias(todasAsMidias, termo, programaParam);
      renderizarItens(filtrados);
    });
  }
});