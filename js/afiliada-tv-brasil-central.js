(() => {
  const ALIASES = ["tv brasil central"];

  const normalizar = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();

  const pertenceAfiliada = (valor) => {
    const n = normalizar(valor);
    return ALIASES.some((alias) => n.includes(alias));
  };

  const extrairIds = (valor) => String(valor || "").toUpperCase().match(/\d{4}B\d{6}/g) || [];

  function classificarRegistro(registro) {
    const base = normalizar([
      registro.DESCRICAO,
      registro.EDITORIA,
      registro.PROGRAMA,
      registro.PGM,
    ].join(" "));

    if (/\bstand\s*-?\s*up\b/.test(base) || /\bnoticia\b/.test(base) || /\bnota\b/.test(base) || /\bpassagem\b/.test(base)) {
      return "noticia";
    }
    return "vt";
  }

  function registrosDaAfiliada(registros) {
    return (registros || []).filter((registro) => pertenceAfiliada(registro.AFILIADA_EMISSORA));
  }

  function idsUnicos(registros, tipo = null) {
    const ids = new Set();
    for (const registro of registros) {
      if (tipo && classificarRegistro(registro) !== tipo) continue;
      extrairIds(registro.ID).forEach((id) => ids.add(id));
    }
    return ids;
  }

  function reporteresDaAfiliada(registros) {
    const nomes = new Set();
    for (const registro of registros) {
      const nome = String(registro.REPORTER || "").trim();
      if (nome) nomes.add(nome);
    }
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function renderizarReporteres(nomes) {
    const lista = document.getElementById("afiliadaReporteresLista");
    if (!lista) return;

    if (!nomes.length) {
      lista.innerHTML = '<div class="afiliada-vazio">Nenhum repórter identificado para esta afiliada nos registros atuais.</div>';
      return;
    }

    lista.innerHTML = nomes
      .map((nome) => `<span class="afiliada-reporter">${nome}</span>`)
      .join("");
  }

  async function carregarAcervoAgroOpcional() {
    try {
      const resposta = await fetch(`../data/agrocultura-acervo.json?v=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) return null;
      const dados = await resposta.json();
      return {
        vts: Array.isArray(dados.vts) ? dados.vts : [],
        noticias: Array.isArray(dados.noticias) ? dados.noticias : [],
      };
    } catch (erro) {
      console.warn("Acervo estruturado do AgroCultura indisponível; usando somente a planilha imgs.", erro);
      return null;
    }
  }

  function complementarContagensComAcervo(acervo, registrosAfiliada, vts, noticias) {
    if (!acervo) return;

    const idsAfiliada = new Set();
    registrosAfiliada.forEach((registro) => extrairIds(registro.ID).forEach((id) => idsAfiliada.add(id)));

    for (const item of acervo.vts || []) {
      const candidatos = Array.isArray(item.ids) && item.ids.length ? item.ids : extrairIds(item.id);
      candidatos.forEach((id) => {
        const normalizado = String(id || "").toUpperCase().trim();
        if (idsAfiliada.has(normalizado)) vts.add(normalizado);
      });
    }

    for (const item of acervo.noticias || []) {
      const candidatos = Array.isArray(item.ids) && item.ids.length ? item.ids : extrairIds(item.id);
      candidatos.forEach((id) => {
        const normalizado = String(id || "").toUpperCase().trim();
        if (idsAfiliada.has(normalizado)) noticias.add(normalizado);
      });
    }
  }

  async function iniciar() {
    const status = document.getElementById("afiliadaStatus");

    try {
      const registros = await DadosMedia.carregarCSV();
      const afiliada = registrosDaAfiliada(registros);

      const vts = idsUnicos(afiliada, "vt");
      const noticias = idsUnicos(afiliada, "noticia");
      const reporteres = reporteresDaAfiliada(afiliada);

      const acervo = await carregarAcervoAgroOpcional();
      complementarContagensComAcervo(acervo, afiliada, vts, noticias);

      document.getElementById("afiliadaTotalVts").textContent = vts.size;
      document.getElementById("afiliadaTotalNoticias").textContent = noticias.size;
      document.getElementById("afiliadaTotalReporteres").textContent = reporteres.length;
      renderizarReporteres(reporteres);

      if (status) {
        status.textContent = afiliada.length
          ? `${afiliada.length} registro(s) da TV Brasil Central encontrados no catálogo.`
          : "Nenhum registro da TV Brasil Central foi encontrado na planilha imgs.";
      }
    } catch (erro) {
      console.error("Erro ao carregar página da TV Brasil Central:", erro);
      document.getElementById("afiliadaTotalVts").textContent = "0";
      document.getElementById("afiliadaTotalNoticias").textContent = "0";
      document.getElementById("afiliadaTotalReporteres").textContent = "0";
      if (status) status.textContent = "Não foi possível carregar os dados da afiliada.";
      renderizarReporteres([]);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
