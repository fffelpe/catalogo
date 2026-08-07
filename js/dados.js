// URL da nova planilha unificada
const URL_CATALOGO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2OEG80BFtybMx8s_f8LQBcFB0ABufM9eVtLNEyRbqndaKdXEozzt_A969NEX_Iv2vdPYSvQU_P2FP/pub?gid=0&single=true&output=csv';

async function carregarDadosUnificados() {
    try {
        const response = await fetch(URL_CATALOGO);
        const dataCsv = await response.text();
        
        // Separa as linhas e pula o cabeçalho (índice 0)
        const linhas = dataCsv.split('\n').slice(1);
        
        const catalogo = linhas.map(linha => {
            // Nota: Se a sua descrição tiver vírgulas, é altamente recomendável usar 
            // a biblioteca PapaParse (https://papaparse.com/) em vez do split simples.
            const colunas = linha.split(','); 
            
            return {
                id: colunas[0] ? colunas[0].trim() : '',
                descricao: colunas[1] ? colunas[1].trim() : '',
                data: colunas[2] ? colunas[2].trim() : '',
                local: colunas[3] ? colunas[3].trim() : '',
                reporter: colunas[4] ? colunas[4].trim() : '',
                afiliada: colunas[5] ? colunas[5].trim() : '',
                programa: colunas[6] ? colunas[6].trim() : ''
            };
        }).filter(item => item.id !== ''); // Filtra linhas vazias
        
        return catalogo;
    } catch (erro) {
        console.error("Erro ao carregar a planilha:", erro);
        return [];
    }
}