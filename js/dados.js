// dados.js - Responsável por carregar e gerenciar os dados do imgs.csv

const DadosMedia = {
    registros: [],
    carregado: false,

    async carregarCSV() {
        if (this.carregado) return this.registros;

        return new Promise((resolve, reject) => {
            // Usa PapaParse para ler o imgs.csv sem travar a tela
            Papa.parse("imgs.csv", {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    this.registros = results.data;
                    this.carregado = true;
                    resolve(this.registros);
                },
                error: (err) => {
                    console.error("Erro ao ler imgs.csv:", err);
                    reject(err);
                }
            });
        });
    },

    buscar(termo) {
        if (!termo) return this.registros;
        const query = termo.toLowerCase();
        
        return this.registros.filter(item => {
            const id = (item.ID || "").toLowerCase();
            const desc = (item.DESCRIÇÃO || "").toLowerCase();
            const reporter = (item.REPÓRTER || "").toLowerCase();
            
            return id.includes(query) || desc.includes(query) || reporter.includes(query);
        });
    }
};