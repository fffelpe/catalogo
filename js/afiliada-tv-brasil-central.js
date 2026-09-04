(() => {
  const ALIASES = [
    "tv brasil central",
    "tv brasil central / go",
    "tv brasil central/go",
  ];

  const normalizar = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();

  const pertenceAfiliada = (valor) => {
    const n = normalizar(valor);
    return ALIASES.some((alias) => n === alias || n.includes(alias));
  };

  const extrairIds = (valor) => String(valor || "").toUpperCase().match(/\d{4}B\d{6}/g) || [];

  function criarIndiceAfiliada(registros) {
    const mapa = new Map();
    for (const registro of registros) {
      if (!pertenceAfiliada(registro.AFILIADA_EMISSORA)) continue;
      for (const id of extrairIds(registro.ID)) {
        if (!mapa.has(id)) mapa.set(id, registro);
      }
    }
    return mapa;
  }

  function idsDaLista(lista, indiceAfiliada) {
    const ids = new Set();
    for (const item of lista || []) {
      const candidatos = Array.isArray(item.ids) && item.ids.length ? item.ids : extrairIds(item.id);
      candidatos.forEach((id) => {
        const normalizado = String(id || "").toUpperCase().trim();
        if (indiceAfiliada.has(normalizado)) ids.add(normalizado);
      });
    }
    return ids;
  }

  function reporteresDaAfiliada(registros, acervo, indiceAfiliada) {
    const nomes = new Set();

    registros.forEach((registro) => {
      if (!pertenceAfiliada(registro.AFILIADA_EMISSORA)) return;
      const nome = String(registro.REPORTER || "").trim();
      if (nome) nomes.add(nome);
    });

    [...(acervo.vts || []), ...(acervo.noticias || [])].forEach((item) => {
      const candidatos = Array.isArray(item.ids) && item.ids.length ? item.ids : extrairIds(item.id);
      const vinculado = candidatos.some((id) => indiceAfiliada.has(String(id || "").toUpperCase().trim()));
      if (!vinculado) return;
      const nome = String(item.reporter || "").trim();
      if (nome) nomes.add(nome);
    });

    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function renderizarReporteres(nomes) {
    const lista = document.getElementById("afiliadaReporteresLista");
    if (!lista) return;

    if (!nomes.length) {
      lista.innerHTML = '<div class="afiliada-vazio">Nenhum repórter identificado para esta afiliada nos registros atuais.</div>';
      return;
    }

    lista.innerHTML = nomes.map((nome) => `<span class="afiliada-reporter">${nome}</span>`).join("");
  }

  async function carregarAcervoAgro() {
    const resposta = await fetch(`../data/agrocultura-acervo.json?v=${Date.now()}`, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`Falha ao carregar acervo estruturado (${resposta.status}).`);
    const dados = await resposta.json();
    return {
      vts: Array.isArray(dados.vts) ? dados.vts : [],
      noticias: Array.isArray(dados.noticias) ? dados.noticias : [],
      parcial: Boolean(dados.parcial),
    };
  }

  async function iniciar() {
    const status = document.getElementById("afiliadaStatus");

    try {
      const [registros, acervo] = await Promise.all([
        DadosMedia.carregarCSV(),
        carregarAcervoAgro(),
      ]);

      const indiceAfiliada = criarIndiceAfiliada(registros);
      const vts = idsDaLista(acervo.vts, indiceAfiliada);
      const noticias = idsDaLista(acervo.noticias, indiceAfiliada);
      const reporteres = reporteresDaAfiliada(registros, acervo, indiceAfiliada);

      document.getElementById("afiliadaTotalVts").textContent = vts.size;
      document.getElementById("afiliadaTotalNoticias").textContent = noticias.size;
      document.getElementById("afiliadaTotalReporteres").textContent = reporteres.length;
      renderizarReporteres(reporteres);

      if (status) {
        status.textContent = acervo.parcial
          ? "Dados disponíveis no catálogo; algumas fontes ainda estão em sincronização."
          : "Dados atualizados automaticamente a partir do catálogo.";
      }
    } catch (erro) {
      console.error("Erro ao carregar página da TV Brasil Central:", erro);
      if (status) status.textContent = "Não foi possível carregar os dados da afiliada.";
      renderizarReporteres([]);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
