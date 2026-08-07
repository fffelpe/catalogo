function realizarBusca(dados, termoBusca) {
    if (!termoBusca) return dados;
    
    // Converte o termo de busca para minúsculo para garantir a validação independente da caixa
    const termo = termoBusca.toLowerCase().trim();
    
    return dados.filter(item => {
        // Junta todas as propriedades do item em uma única string e converte para minúsculo
        const conteudoLinha = Object.values(item).join(' ').toLowerCase();
        
        // Verifica se o termo existe em qualquer lugar da linha (ID, Descrição, Local, etc)
        return conteudoLinha.includes(termo);
    });
}
function renderizarResultados(resultados) {
    const container = document.getElementById('container-resultados'); // Ajuste para o ID real do seu HTML
    container.innerHTML = ''; // Limpa os resultados anteriores
    
    if (resultados.length === 0) {
        container.innerHTML = '<p>Nenhuma mídia encontrada para este termo.</p>';
        return;
    }

    resultados.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('resultado-card'); // Classe definida no seu main.css
        
        // Estrutura exibindo todas as colunas solicitadas
        card.innerHTML = `
            <div class="resultado-header">
                <h3>ID: <span>${item.id}</span></h3>
                <span class="tag-programa">${item.programa}</span>
            </div>
            <div class="resultado-body">
                <p><strong>Descrição:</strong> ${item.descricao}</p>
                <div class="resultado-meta">
                    <p><strong>Data:</strong> ${item.data}</p>
                    <p><strong>Local:</strong> ${item.local}</p>
                    <p><strong>Repórter:</strong> ${item.reporter}</p>
                    <p><strong>Afiliada:</strong> ${item.afiliada}</p>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}